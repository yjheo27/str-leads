package llm

// STUB MODE: ExtractLead currently returns fake data for local testing.
// To enable real Claude AI extraction:
//   1. Get an API key at https://console.anthropic.com
//   2. Set ANTHROPIC_API_KEY in backend/.env
//   3. Delete the stub block below and uncomment the real implementation.

import (
	"str-leads/backend/models"
)

// systemPrompt is sent as the "system" role to claude-sonnet-4-20250514.
// It instructs Claude to return raw JSON only — no markdown fences —
// so json.Unmarshal works directly on the response text.
//
// Strategy rules embedded here determine how the model classifies each lead:
//   - "Rent Arbitrage"  → owner wants a long-term corporate tenant who sublists on Airbnb
//   - "STR Management"  → owner wants hands-off Airbnb/VRBO management
//   - "Unassigned"      → not enough signal
const systemPrompt = `You are a real estate lead extraction assistant.
Given raw text from a property listing, webpage, or message,
extract contact information and classify the lead strategy.

Return ONLY a valid JSON object. No markdown. No explanation.
No code fences. Raw JSON only, exactly this shape:

{
  "name":     "string or null",
  "phone":    "string or null",
  "email":    "string or null",
  "address":  "string or null",
  "strategy": "Rent Arbitrage" | "STR Management" | "Unassigned"
}

Strategy classification rules:
- "Rent Arbitrage": the owner wants to lease their property to a
  company or individual who will then sublet it on Airbnb/VRBO.
  Signal words: rent to company, corporate lease, subletting ok,
  rent arbitrage.
- "STR Management": the owner wants someone else to manage their
  property as a short-term rental on their behalf. Signal words:
  management, hands-off, Airbnb management, co-host, property
  manager needed.
- "Unassigned": not enough signal to classify, or the listing
  is a standard long-term rental with no STR intent.

Use null for any field you cannot confidently extract.`

func ptr(s string) *string { return &s }

// ExtractLead — STUB: returns deterministic fake data so the full
// frontend → backend → DB flow can be tested without an API key.
//
// --- REAL IMPLEMENTATION (swap in when ANTHROPIC_API_KEY is ready) ---
//
// func ExtractLead(rawText string) (models.Lead, error) {
//     apiKey := os.Getenv("ANTHROPIC_API_KEY")
//     if apiKey == "" {
//         return models.Lead{}, fmt.Errorf("ANTHROPIC_API_KEY not set")
//     }
//     payload, _ := json.Marshal(anthropicRequest{
//         Model:     "claude-sonnet-4-20250514",
//         MaxTokens: 1024,
//         System:    systemPrompt,
//         Messages:  []message{{Role: "user", Content: rawText}},
//     })
//     req, _ := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(payload))
//     req.Header.Set("Content-Type", "application/json")
//     req.Header.Set("x-api-key", apiKey)
//     req.Header.Set("anthropic-version", "2023-06-01")
//     resp, err := http.DefaultClient.Do(req)
//     if err != nil { return models.Lead{}, err }
//     defer resp.Body.Close()
//     raw, _ := io.ReadAll(resp.Body)
//     if resp.StatusCode != http.StatusOK {
//         return models.Lead{}, fmt.Errorf("anthropic error %d: %s", resp.StatusCode, raw)
//     }
//     var ar anthropicResponse
//     json.Unmarshal(raw, &ar)
//     if len(ar.Content) == 0 { return models.Lead{}, fmt.Errorf("empty response") }
//     var ej extractedJSON
//     if err := json.Unmarshal([]byte(ar.Content[0].Text), &ej); err != nil {
//         return models.Lead{}, fmt.Errorf("parse failed: %w\nraw: %s", err, ar.Content[0].Text)
//     }
//     return models.Lead{Name: ej.Name, Phone: ej.Phone, Email: ej.Email,
//         Address: ej.Address, Strategy: ej.Strategy}, nil
// }
//
// Also restore these imports when uncommenting:
//   "bytes", "encoding/json", "fmt", "io", "net/http", "os"
//
// And restore these types:
//   anthropicRequest, message, anthropicResponse, extractedJSON
// ---------------------------------------------------------------------

var strategies = []string{"Rent Arbitrage", "STR Management", "Unassigned"}
var stubIndex int

func ExtractLead(_ string) (models.Lead, error) {
	strategy := strategies[stubIndex%len(strategies)]
	stubIndex++
	return models.Lead{
		Name:     ptr("Jane Smith"),
		Phone:    ptr("305-555-0192"),
		Email:    ptr("jane@example.com"),
		Address:  ptr("1234 Ocean Dr, Miami Beach, FL 33139"),
		Strategy: strategy,
	}, nil
}
