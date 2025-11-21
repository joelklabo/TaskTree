# Actions hardening notes

- Prefer pinned SHAs for third-party actions. Update pins monthly via Dependabot/maintenance chore and record new SHAs here when pinned.
- Keep minimal permissions per job (`contents: read`, `pull-requests: write` only when needed).
- Use OIDC for deploy/release (Pages/release workflows already request `id-token` when needed).
- Rotate/cache keys and secrets: avoid storing tokens; rely on `GITHUB_TOKEN` unless external creds are required.
- Review `dependabot.yml` updates weekly and rebuild pins.

Pinned SHAs (2025-02):
- actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 (v4)
- actions/setup-python@a26af69be951a213d495a4c3e4e4022e16d87065 (v5)
- actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 (v4)
- actions/cache@0057852bfaa89a56745cba8c7296529d2fc39830 (v4)
- actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 (v4)
- actions/github-script@f28e40c7f34bde8b3046d885e986cb6290c5673b (v7)
- actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa (v3)
- actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e (v4)
- actions/labeler@8558fd74291d67161a8a78ce36a881fa63b766a9 (v5)
- dorny/paths-filter@de90cc6fb38fc0963ad72b210f1f284cd68cea36 (v3)
- github/codeql-action@901f0fdebfadabaa0664a07bd572cbd2ff90b07e (v3)
- anchore/sbom-action@fbfd9c6c189226748411491745178e0c2017392d (v0)
- aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8 (0.24.0)
- softprops/action-gh-release@5be0e66d93ac7ed76da52eca8bb058f665c3a5fe (v2)
- docker/setup-buildx-action@e468171a9de216ec08956ac3ada2f0791b6bd435 (v3)
- docker/build-push-action@263435318d21b8e681c14492fe198d362a7d2c83 (v6)
- docker/login-action@465a07811f14bebb1938fbed4728c6a1ff8901fc (v3)
- sigstore/cosign-installer@f713795cb21599bc4e5c4b58cbad1da852d7eeb9 (v3)
- actions/attest-build-provenance@92c65d2898f1f53cfdc910b962cecff86e7f8fcc (v1)
