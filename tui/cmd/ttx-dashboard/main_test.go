package main

import (
	"os"
	"testing"
	"strings"
)

func TestRenderSampleState(t *testing.T) {
	// Create a temporary state file.
	tmp, err := os.CreateTemp("", "state*.json")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	t.Cleanup(func() { os.Remove(tmp.Name()) })
	state := `{
  "status": { "env": "dev", "ready": true, "updated_at": "demo" },
  "git": { "branch": "main", "ahead": 1, "behind": 0, "dirty": 2 },
  "servers": [ { "name": "backend", "status": true, "port": 8000 } ],
  "alerts": { "total": 1, "recent_text": "alert text", "recent": [ { "level": "warn", "msg": "demo" } ] },
  "ci": { "status": "success", "recent_text": "ci text", "runs": [ { "workflow": "ci", "status": "completed", "conclusion": "success", "branch": "main", "url": "https://example.com" } ] },
  "traces": { "recent_runs": 3 },
  "logs": { "configured_sources": 2 }
}`
	if _, err := tmp.WriteString(state); err != nil {
		t.Fatalf("write state: %v", err)
	}

	m := initialModel(tmp.Name())
	view := m.View()
	if !containsAll(view, []string{"TaskTree Dashboard", "Env", "Git", "Servers", "Alerts", "CI", "Traces", "Logs"}) {
		t.Fatalf("view missing sections: %s", view)
	}
}

func containsAll(hay string, needles []string) bool {
	for _, n := range needles {
		if !strings.Contains(hay, n) {
			return false
		}
	}
	return true
}
