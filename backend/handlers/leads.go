package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"html"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"str-leads/backend/db"
	"str-leads/backend/llm"
	"str-leads/backend/models"
)

var validStatuses = map[string]bool{
	"New":       true,
	"Contacted": true,
	"No Answer": true,
}

var (
	tagRe   = regexp.MustCompile(`<[^>]+>`)
	spaceRe = regexp.MustCompile(`\s+`)
)

func stripHTML(raw string) string {
	s := tagRe.ReplaceAllString(raw, " ")
	s = html.UnescapeString(s)
	s = spaceRe.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func fetchURL(ctx context.Context, url string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; STRLeadBot/1.0)")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	b, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	return stripHTML(string(b)), nil
}

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func Scrape(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !scrapeRateLimiter.allow(clientIP(r)) {
		writeError(w, http.StatusTooManyRequests, "rate limit exceeded: max 10 requests per minute")
		return
	}

	var body struct {
		URL     string `json:"url"`
		RawText string `json:"raw_text"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var text string
	if body.URL != "" {
		var err error
		text, err = fetchURL(r.Context(), body.URL)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch URL: "+err.Error())
			return
		}
	} else {
		text = body.RawText
	}

	extracted, err := llm.ExtractLead(text)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "extraction failed: "+err.Error())
		return
	}

	var lead models.Lead
	err = db.Pool.QueryRow(context.Background(),
		`INSERT INTO leads (name, phone, email, address, strategy, status)
		 VALUES ($1, $2, $3, $4, $5, 'New')
		 RETURNING id, name, phone, email, address, strategy, status, notes, created_at`,
		extracted.Name, extracted.Phone, extracted.Email, extracted.Address, extracted.Strategy,
	).Scan(&lead.ID, &lead.Name, &lead.Phone, &lead.Email, &lead.Address,
		&lead.Strategy, &lead.Status, &lead.Notes, &lead.CreatedAt)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save lead: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(lead) //nolint:errcheck
}

func List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Pool.Query(context.Background(),
		`SELECT id, name, phone, email, address, strategy, status, notes, created_at
		 FROM leads ORDER BY created_at DESC`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query leads: "+err.Error())
		return
	}
	defer rows.Close()

	leads := []models.Lead{}
	for rows.Next() {
		var lead models.Lead
		if err := rows.Scan(&lead.ID, &lead.Name, &lead.Phone, &lead.Email, &lead.Address,
			&lead.Strategy, &lead.Status, &lead.Notes, &lead.CreatedAt); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan lead: "+err.Error())
			return
		}
		leads = append(leads, lead)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(leads) //nolint:errcheck
}

func UpdateStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing lead id")
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if !validStatuses[body.Status] {
		writeError(w, http.StatusBadRequest, `invalid status: must be "New", "Contacted", or "No Answer"`)
		return
	}

	var lead models.Lead
	err := db.Pool.QueryRow(context.Background(),
		`UPDATE leads SET status=$1 WHERE id=$2
		 RETURNING id, name, phone, email, address, strategy, status, notes, created_at`,
		body.Status, id,
	).Scan(&lead.ID, &lead.Name, &lead.Phone, &lead.Email, &lead.Address,
		&lead.Strategy, &lead.Status, &lead.Notes, &lead.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "lead not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update lead: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lead) //nolint:errcheck
}

func UpdateNotes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing lead id")
		return
	}

	var body struct {
		Notes string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var lead models.Lead
	err := db.Pool.QueryRow(context.Background(),
		// NULLIF converts empty string to NULL so clearing notes stores NULL not ""
		`UPDATE leads SET notes=NULLIF($1,'') WHERE id=$2
		 RETURNING id, name, phone, email, address, strategy, status, notes, created_at`,
		body.Notes, id,
	).Scan(&lead.ID, &lead.Name, &lead.Phone, &lead.Email, &lead.Address,
		&lead.Strategy, &lead.Status, &lead.Notes, &lead.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "lead not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to update notes: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(lead) //nolint:errcheck
}

func DeleteLead(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := r.PathValue("id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing lead id")
		return
	}

	tag, err := db.Pool.Exec(context.Background(), `DELETE FROM leads WHERE id=$1`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete lead: "+err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "lead not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg}) //nolint:errcheck
}
