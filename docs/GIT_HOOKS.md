# Git hooks

Local hooks are provided to keep changes aligned with CI before they ever reach GitHub.

## Installing
```
bash scripts/git_hooks/install_hooks.sh
```

This symlinks the hooks into `.git/hooks/`.

## Hooks
- `pre-commit`: runs `make ci` (lint, tests, build). Set `SKIP_CI_HOOK=1` to bypass temporarily.
- `commit-msg`: ensures the subject is non-empty and <= 72 chars. Set `SKIP_COMMIT_MSG_HOOK=1` to bypass.

## Notes
- Keep hooks quick: if the suite gets slow, consider swapping to a tiered hook (lint/format on staged files, then full CI on `pre-push`). For now, CI is fast enough to run pre-commit.
- Hooks run locally only; CI still enforces the same checks on PRs.
