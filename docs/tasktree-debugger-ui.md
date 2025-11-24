# TaskTree Debugger UI Enhancements

- Live Debugger now ships with an input context template, JSON lint/format controls, and a capture button that snapshots the current flow/step context, logs, agent config, and prompt into a reusable saved context. Saved contexts are persisted locally and can be loaded back into the session starter.
- The debugger sidebar lets you pick a step, inspect the active agent configuration and prompt template, and launch sessions with either the recorded context or a custom override (including breakpoints).
- All text editors (flows, prompts, workbench inputs/outputs, error playground) use the upgraded code editor with syntax highlighting, copy/format actions, and JSON/YAML linting; flows and agent files can be saved directly from the editor chrome.
- The header now exposes a dev server status indicator (pulsing green when healthy, solid red when offline) and clicking the TaskTree logo returns to the landing view.
