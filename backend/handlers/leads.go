package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

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

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
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
		resp, err := http.Get(body.URL) //nolint:noctx
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to fetch URL: "+err.Error())
			return
		}
		defer resp.Body.Close()
		b, err := io.ReadAll(resp.Body)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to read URL: "+err.Error())
			return
		}
		text = string(b)
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
		 RETURNING id, name, phone, email, address, strategy, status, created_at`,
		extracted.Name, extracted.Phone, extracted.Email, extracted.Address, extracted.Strategy,
	).Scan(&lead.ID, &lead.Name, &lead.Phone, &lead.Email, &lead.Address, &lead.Strategy, &lead.Status, &lead.CreatedAt)
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
		`SELECT id, name, phone, email, address, strategy, status, created_at
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
			&lead.Strategy, &lead.Status, &lead.CreatedAt); err != nil {
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
		 RETURNING id, name, phone, email, address, strategy, status, created_at`,
		body.Status, id,
	).Scan(&lead.ID, &lead.Name, &lead.Phone, &lead.Email, &lead.Address,
		&lead.Strategy, &lead.Status, &lead.CreatedAt)
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

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg}) //nolint:errcheck
}
