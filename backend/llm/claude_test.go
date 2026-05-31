package llm

import (
	"testing"
)

// These tests cover the stub implementation of ExtractLead.
// When the real Anthropic API is wired in, replace these with tests
// that mock the HTTP client and assert correct JSON parsing behaviour.

func TestExtractLeadReturnsValidShape(t *testing.T) {
	lead, err := ExtractLead("some listing text")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if lead.Name == nil || *lead.Name == "" {
		t.Error("expected non-empty Name")
	}
	if lead.Phone == nil || *lead.Phone == "" {
		t.Error("expected non-empty Phone")
	}
	if lead.Email == nil || *lead.Email == "" {
		t.Error("expected non-empty Email")
	}
	valid := map[string]bool{
		"Rent Arbitrage": true,
		"STR Management": true,
		"Unassigned":     true,
	}
	if !valid[lead.Strategy] {
		t.Errorf("unexpected strategy %q: must be one of Rent Arbitrage, STR Management, Unassigned", lead.Strategy)
	}
}

func TestExtractLeadCyclesAllThreeStrategies(t *testing.T) {
	stubIndex = 0 // reset so the test is deterministic
	seen := map[string]bool{}
	for i := 0; i < len(strategies); i++ {
		lead, err := ExtractLead("text")
		if err != nil {
			t.Fatalf("call %d returned error: %v", i, err)
		}
		seen[lead.Strategy] = true
	}
	for _, s := range strategies {
		if !seen[s] {
			t.Errorf("strategy %q never returned across %d calls", s, len(strategies))
		}
	}
}
