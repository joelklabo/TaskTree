# Security Policy

- Report vulnerabilities privately via security@honk.dev (or DM @honk). Do not open public issues for suspected vulns.
- Include repro steps, version/commit, and any logs you can share. If secrets may be involved, strip/redact first.
- Secret scanning/push protection is expected; avoid committing credentials. Rotate anything that may have leaked.
- Dependencies: CodeQL runs on PRs and main; SBOM + Trivy scans run on PR and weekly. Critical findings block release until fixed.
