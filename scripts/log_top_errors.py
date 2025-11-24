#!/usr/bin/env python3
"""Group recent ERROR/FATAL log lines into top buckets with normalization.

Usage:
  python scripts/log_top_errors.py --window-min 10 --top 5 logs/*.log
  WINDOW_MIN=30 TOP=10 python scripts/log_top_errors.py logs/app.log

By default the script:
  - reads the provided log files (globs allowed)
  - keeps only lines with ERROR/ERR/FATAL in the last N minutes (default 10)
  - normalizes each message to collapse IDs/nums/IPs so near-duplicates group
  - prints the top N buckets with counts and an exemplar line

Optional:
  --prom-file /path/to/error_top5.prom  Write a Prometheus exposition file
  --webhook-url https://hooks.slack...  Optional webhook (Slack or custom)
  --webhook-format text|json            Payload format (default: text)
  --window-min 30                       Look back 30 minutes
  --top 10                              Show top 10 buckets
"""

import argparse
import datetime as dt
import glob
import hashlib
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.request
from typing import Dict, List, Tuple

# Matches timestamps like 2021-03-04 15:54:16.079 or 2021-03-04T15:54:16
TS_RE = re.compile(r"^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)")
LEVEL_RE = re.compile(r"\b(ERROR|ERR|FATAL)\b", re.IGNORECASE)


def parse_ts(ts_text: str) -> dt.datetime:
    """Parse timestamp to naive datetime. Falls back gracefully on errors."""
    try:
        return dt.datetime.fromisoformat(ts_text)
    except ValueError:
        for fmt in ("%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return dt.datetime.strptime(ts_text, fmt)
            except ValueError:
                continue
    raise ValueError(f"Unparseable timestamp: {ts_text}")


def normalize(msg: str) -> str:
    """Collapse IDs/numbers/IPs/hex strings to reduce cardinality."""
    msg = msg.splitlines()[0]  # use only first line of multi-line messages
    if (
        "ClientBoom" in msg
        or "ClientErrorDemo" in msg
        or "My Test Error" in msg
        or "[SYNTHETIC]" in msg
    ):
        msg = "[synthetic] " + msg
    msg = re.sub(r"\b\d{1,3}(?:\.\d{1,3}){3}\b", "<ip>", msg)  # IPv4
    msg = re.sub(r"\b0x[0-9a-fA-F]+\b", "<hex>", msg)
    msg = re.sub(r"\b[0-9a-fA-F]{8,}\b", "<id>", msg)  # hashes/uuids/etc.
    msg = re.sub(r"\b\d+\b", "<n>", msg)  # bare numbers
    msg = re.sub(r'"[^"]*"', '"<str>"', msg)
    msg = re.sub(r"'[^']*'", "'<str>'", msg)
    msg = re.sub(r"\s+", " ", msg).strip()
    return msg


def signature(msg: str) -> Tuple[str, str]:
    """Return (hash, normalized msg)."""
    normalized = normalize(msg)
    digest = hashlib.sha1(normalized.encode()).hexdigest()[:8]
    return digest, normalized


def extract_message(line: str) -> str:
    """Strip timestamp/level prefix; leave the meaningful payload."""
    if "] " in line:
        return line.split("] ", 1)[1].strip()
    return TS_RE.sub("", line, count=1).strip()


def escape_label_value(val: str) -> str:
    """Escape Prometheus label values."""
    return val.replace("\\", "\\\\").replace("\n", "\\n").replace('"', '\\"')


def write_prom_file(path: str, total: int, buckets: List[Tuple[str, Dict]]) -> None:
    """Write Prometheus exposition for the provided buckets."""
    lines = [
        "# HELP log_error_bucket_total Error counts grouped by normalized message",
        "# TYPE log_error_bucket_total counter",
    ]
    for sig, data in buckets:
        label_msg = escape_label_value(data["normalized"])
        lines.append(
            f'log_error_bucket_total{{msg_hash="{sig}",msg="{label_msg}"}} {data["count"]}'
        )
    lines.append(f"log_error_total {total}")
    body = "\n".join(lines) + "\n"
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with tempfile.NamedTemporaryFile("w", delete=False, dir=os.path.dirname(path)) as tf:
        tf.write(body)
        tmp_path = tf.name
    os.replace(tmp_path, path)


def send_webhook(webhook_url: str, body: str, as_text: bool = True) -> None:
    """POST a JSON payload to a webhook. If as_text, wrap in {'text': body}."""
    payload = {"text": body} if as_text else body
    req = urllib.request.Request(
        webhook_url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status >= 300:
                print(f"Webhook responded with HTTP {resp.status}", file=sys.stderr)
    except urllib.error.URLError as exc:
        print(f"Webhook post failed: {exc}", file=sys.stderr)


def collect_logs(paths: List[str], window_min: int) -> Dict[str, Dict]:
    cutoff = dt.datetime.now() - dt.timedelta(minutes=window_min)
    buckets: Dict[str, Dict] = {}
    synthetic_buckets: Dict[str, Dict] = {}
    total = 0
    total_synth = 0

    expanded_paths: List[str] = []
    for p in paths:
        expanded_paths.extend(glob.glob(p))

    for path in expanded_paths:
        try:
            with open(path, "r", errors="ignore") as fh:
                for line in fh:
                    if not LEVEL_RE.search(line):
                        continue
                    ts_match = TS_RE.match(line)
                    if not ts_match:
                        continue
                    try:
                        ts = parse_ts(ts_match.group(1))
                    except ValueError:
                        continue
                    if ts < cutoff:
                        continue
                    msg = extract_message(line)
                    sig, normalized = signature(msg)
                    lower_line = line.lower()
                    is_synth = (
                        "[synthetic]" in normalized.lower()
                        or "clientboom" in lower_line
                        or "clienterrordemo" in lower_line
                    )
                    target = synthetic_buckets if is_synth else buckets
                    bucket = target.setdefault(
                        sig, {"count": 0, "normalized": normalized, "example": line.strip()}
                    )
                    bucket["count"] += 1
                    if is_synth:
                        total_synth += 1
                    else:
                        total += 1
        except FileNotFoundError:
            continue
    return {"buckets": buckets, "total": total, "synthetic": synthetic_buckets, "total_synth": total_synth}


def main() -> int:
    parser = argparse.ArgumentParser(description="Show top recent error buckets in logs.")
    parser.add_argument("paths", nargs="+", help="Log files or glob patterns (e.g., logs/*.log)")
    parser.add_argument(
        "--window-min",
        type=int,
        default=int(os.environ.get("WINDOW_MIN", 10)),
        help="Look back this many minutes (default: 10 or env WINDOW_MIN)",
    )
    parser.add_argument(
        "--top",
        type=int,
        default=int(os.environ.get("TOP", 5)),
        help="Number of buckets to show (default: 5 or env TOP)",
    )
    parser.add_argument(
        "--prom-file",
        help="Optional Prometheus exposition path (e.g., /var/lib/node_exporter/textfile_collector/error_top5.prom)",
    )
    parser.add_argument(
        "--webhook-url",
        default=os.environ.get("WEBHOOK_URL"),
        help="Optional Slack-compatible webhook URL (or set WEBHOOK_URL env)",
    )
    parser.add_argument(
        "--webhook-format",
        choices=["text", "json"],
        default=os.environ.get("WEBHOOK_FORMAT", "text"),
        help="Webhook payload format (text|json). Default: text or env WEBHOOK_FORMAT",
    )
    args = parser.parse_args()

    result = collect_logs(args.paths, args.window_min)
    buckets = result["buckets"]
    total = result["total"]
    synthetic = result.get("synthetic", {})
    if not total and not synthetic:
        print(f"No ERROR/ERR/FATAL lines in last {args.window_min} minutes.")
        return 0

    top_buckets = sorted(buckets.items(), key=lambda item: item[1]["count"], reverse=True)[: args.top]
    top_synth = sorted(synthetic.items(), key=lambda item: item[1]["count"], reverse=True)[: args.top]

    real_filtered: List[Tuple[str, Dict]] = []
    for sig, data in top_buckets:
        norm_lower = data["normalized"].lower()
        if "clientboom" in norm_lower or "clienterrordemo" in norm_lower or "[synthetic]" in norm_lower:
            top_synth.append((sig, data))
        else:
            real_filtered.append((sig, data))
    top_buckets = real_filtered[: args.top]

    for sig, data in top_buckets:
        print(f"{data['count']}x [{sig}] {data['example']}")

    if top_synth:
        print("\n--- Synthetic/triggered errors ---")
        for sig, data in top_synth:
            print(f"{data['count']}x [{sig}] {data['example']}")

    if args.prom_file:
        write_prom_file(args.prom_file, total, top_buckets)

    if args.webhook_url:
        if args.webhook_format == "text":
            lines = [f"Top {len(top_buckets)} errors in last {args.window_min}m (total={total}):"]
            for sig, data in top_buckets:
                lines.append(f"{data['count']}x [{sig}] {data['normalized']}")
            send_webhook(args.webhook_url, "\n".join(lines), as_text=True)
        else:
            payload = {
                "window_min": args.window_min,
                "total": total,
                "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                "buckets": [
                    {
                        "hash": sig,
                        "count": data["count"],
                        "message": data["normalized"],
                        "example": data["example"],
                    }
                    for sig, data in top_buckets
                ],
                "synthetic_buckets": [
                    {
                        "hash": sig,
                        "count": data["count"],
                        "message": data["normalized"],
                        "example": data["example"],
                    }
                    for sig, data in top_synth
                ],
            }
            send_webhook(args.webhook_url, payload, as_text=False)

    return 0


if __name__ == "__main__":
    sys.exit(main())
