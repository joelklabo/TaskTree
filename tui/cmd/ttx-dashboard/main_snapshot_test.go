package main

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

// Snapshot guard to catch layout regressions in the TUI output (spacing/order/cards).
func TestDashboardSnapshotLayout(t *testing.T) {
	state := `{
  "status": { "env": "dev", "ready": true, "updated_at": "2024-01-01T00:00:00Z" },
  "git": { "branch": "main", "ahead": 2, "behind": 1, "dirty": 4 },
  "servers": [ { "name": "backend", "status": true, "port": 8000 }, { "name": "frontend", "status": false, "port": 5173 } ],
  "alerts": { "total": 3, "recent_text": "tail-only alert text", "recent": [ { "level": "warn", "msg": "disk space low" }, { "level": "critical", "msg": "service down", "source": "logs/app.log" } ] },
  "ci": { "status": "success", "recent_text": "", "runs": [ { "workflow": "ci", "status": "completed", "conclusion": "success", "branch": "main", "url": "https://example.com/run/1" }, { "workflow": "lint", "status": "completed", "conclusion": "skipped", "branch": "dev" } ] },
  "traces": { "recent_runs": 5 },
  "logs": { "configured_sources": 7 }
}`

	tmp, err := os.CreateTemp("", "state*.json")
	if err != nil {
		t.Fatalf("temp file: %v", err)
	}
	t.Cleanup(func() { os.Remove(tmp.Name()) })
	if _, err := tmp.WriteString(state); err != nil {
		t.Fatalf("write state: %v", err)
	}

	view := initialModel(tmp.Name()).View()
	clean := normalize(view)
	const golden = `TaskTree Dashboard — 2024-01-01T00:00:00Z
╭─────────────╮╭───────────────────────────╮╭──────────────────────╮╭─────────────────────────╮╭─────────────────────────────────────────────╮╭────────────────╮╭────────────╮
│ Status      ││ Git                       ││ Servers              ││ Alerts                  ││ CI                                          ││ Traces         ││ Logs       │
│ Env: dev    ││ Branch: main              ││ backend: up :8000    ││ Total: 3                ││ Status: success                             ││ Recent runs: 5 ││ Sources: 7 │
│ Ready: true ││ Ahead/Behind/Dirty: 2/1/4 ││ frontend: down :5173 ││ tail-only alert text    ││ ci success (main) https://example.com/run/1 │╰────────────────╯╰────────────╯
╰─────────────╯╰───────────────────────────╯│                      ││ [warn] disk space low   ││ lint skipped (dev)                          │
╰──────────────────────╯│ [critical] service down ││                                             │
│                         │╰─────────────────────────────────────────────╯
╰─────────────────────────╯`

	if clean != golden {
		t.Fatalf("snapshot mismatch.\nexpected:\n%s\n\nactual:\n%s", golden, clean)
	}
}

func normalize(s string) string {
	ansi := regexp.MustCompile(`\x1b\\[[0-9;]*[A-Za-z]`)
	s = ansi.ReplaceAllString(s, "")
	lines := strings.Split(strings.ReplaceAll(s, "\r\n", "\n"), "\n")
	for i, line := range lines {
		line = strings.TrimRight(line, " ")
		line = strings.TrimLeft(line, " ")
		lines[i] = line
	}
	return strings.Join(lines, "\n")
}
