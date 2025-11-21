# Diagrams

Use Mermaid for diagrams and keep sources under `docs/mermaid/` (create the folder if missing).

Recommended flow:
1. Add/update a `.mmd` file in `docs/mermaid/` (see `flow-overview.mmd` for an example).
2. Render to SVG or PNG with Mermaid CLI:
   - `npx @mermaid-js/mermaid-cli -i docs/mermaid/flow-overview.mmd -o docs/mermaid/flow-overview.svg`
3. Commit both the source `.mmd` and the rendered asset.
4. If the diagram is referenced in `README.md` or other docs, update those links in the same commit.

Notes:
- Keep diagrams small and focused; prefer multiple small diagrams over one giant one.
- Include a brief caption/description near any embedded diagram in markdown.
- If Mermaid CLI is not available, note the missing asset in your PR and add it when tooling is present.
