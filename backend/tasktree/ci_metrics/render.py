"""
Utilities to render simple SVG charts from CI timing records.

The GitHub workflow writes JSONL records shaped like:
{
  "run_id": 123,
  "run_number": 42,
  "run_attempt": 1,
  "event": "push",
  "sha": "...",
  "ref": "refs/heads/main",
  "workflow": "Monorepo CI",
  "created_at": "...",
  "total_duration_ms": 120000,
  "jobs": [
    {"name": "Backend Pipeline", "duration_ms": 60000, "steps": [...]},
    ...
  ]
}
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path


@dataclass
class SeriesPoint:
    x: float
    y: float


@dataclass
class Series:
    key: str
    label: str
    color: str
    points: list[SeriesPoint]


def load_records(path: Path) -> list[dict]:
    if not path.exists():
        return []
    records: list[dict] = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


def _job_duration(record: dict, needle: str) -> int | None:
    for job in record.get("jobs", []):
        name = str(job.get("name", "")).lower()
        if needle in name:
            duration = job.get("duration_ms")
            if isinstance(duration, (int, float)):
                return int(duration)
            return None
    return None


def _pad(value: float) -> float:
    return value * 1.05 if value > 0 else 1.0


def _format_duration(ms: float) -> str:
    seconds = ms / 1000
    if seconds < 90:
        return f"{seconds:.1f}s"
    minutes = seconds / 60
    if minutes < 90:
        return f"{minutes:.1f}m"
    hours = minutes / 60
    return f"{hours:.1f}h"


def _build_series(records: list[dict], max_points: int = 60) -> list[Series]:
    records = list(records)
    selected = records[-max_points:]
    if not selected:
        return []

    # Compute per-run durations.
    totals: list[float] = []
    backend: list[float] = []
    frontend: list[float] = []
    docs: list[float] = []
    actions: list[float] = []

    for record in selected:
        totals.append(float(record.get("total_duration_ms", 0)))
        backend.append(float(_job_duration(record, "backend") or 0))
        frontend.append(float(_job_duration(record, "frontend") or 0))
        docs.append(float(_job_duration(record, "docs") or 0))
        actions.append(float(_job_duration(record, "action") or 0))

    series_defs = [
        ("total", "Total CI runtime", "#2563eb", totals),
        ("backend", "Backend job", "#10b981", backend),
        ("frontend", "Frontend job", "#f59e0b", frontend),
        ("docs", "Docs job", "#8b5cf6", docs),
        ("actions", "Actionlint job", "#ef4444", actions),
    ]

    width = 900
    height = 460
    margin = {"left": 70, "right": 24, "top": 28, "bottom": 70}
    plot_width = width - margin["left"] - margin["right"]
    plot_height = height - margin["top"] - margin["bottom"]

    x_step = plot_width / max(1, len(selected) - 1)
    max_y = _pad(max(max(series, default=0) for _, _, _, series in series_defs))

    series_list: list[Series] = []
    for key, label, color, values in series_defs:
        if all(v == 0 for v in values):
            continue
        points = []
        for idx, val in enumerate(values):
            x = margin["left"] + idx * x_step
            y = margin["top"] + (plot_height * (1 - (val / max_y if max_y else 0)))
            points.append(SeriesPoint(x=x, y=y))
        series_list.append(Series(key=key, label=label, color=color, points=points))

    return series_list


def render_svg(records: list[dict], output: Path, max_points: int = 60) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if not records:
        svg = _render_empty_svg()
        output.write_text(svg)
        return

    records = records[-max_points:]
    max_y = _pad(max(float(record.get("total_duration_ms", 0)) for record in records))

    width = 900
    height = 460
    margin = {"left": 70, "right": 24, "top": 28, "bottom": 70}
    plot_width = width - margin["left"] - margin["right"]
    plot_height = height - margin["top"] - margin["bottom"]
    x_step = plot_width / max(1, len(records) - 1)

    series = _build_series(records, max_points=max_points)

    y_ticks = 4
    y_tick_values = [max_y * i / y_ticks for i in range(y_ticks + 1)]

    # X labels: run number or short SHA.
    x_labels: list[str] = []
    for record in records:
        run = record.get("run_number")
        if run:
            x_labels.append(str(run))
            continue
        sha = str(record.get("sha", ""))
        x_labels.append(sha[:7] if sha else "?")

    style_block = (
        "<style>"
        ".axis{stroke:#0f172a;stroke-width:1;}"
        ".grid{stroke:#e5e7eb;stroke-width:1;}"
        ".label{fill:#0f172a;font-family:Arial, sans-serif;font-size:12px;}"
        ".legend{font-size:12px;font-family:Arial, sans-serif;}"
        "</style>"
    )

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">',
        style_block,
        f'<rect x="0" y="0" width="{width}" height="{height}" fill="#f8fafc" rx="6" />',
    ]

    # Grid and axes.
    for tick_val in y_tick_values:
        y = margin["top"] + plot_height * (1 - (tick_val / max_y if max_y else 0))
        lines.append(
            f'<line class="grid" x1="{margin["left"]}" y1="{y:.2f}" '
            f'x2="{width - margin["right"]}" y2="{y:.2f}" />'
        )
        lines.append(
            f'<text class="label" x="{margin["left"] - 8}" y="{y + 4:.2f}" '
            f'text-anchor="end">{_format_duration(tick_val)}</text>'
        )

    x_axis = (
        f'<line class="axis" x1="{margin["left"]}" '
        f'y1="{margin["top"] + plot_height}" '
        f'x2="{width - margin["right"]}" y2="{margin["top"] + plot_height}" />'
    )
    y_axis = (
        f'<line class="axis" x1="{margin["left"]}" y1="{margin["top"]}" '
        f'x2="{margin["left"]}" y2="{margin["top"] + plot_height}" />'
    )
    lines.extend([x_axis, y_axis])

    # X labels.
    if x_labels:
        label_step = max(1, len(x_labels) // 10)
        for idx, label in enumerate(x_labels):
            if idx % label_step != 0 and idx != len(x_labels) - 1:
                continue
            x = margin["left"] + idx * x_step
            lines.append(
                f'<text class="label" x="{x:.2f}" y="{height - 20}" '
                f'text-anchor="middle">{label}</text>'
            )

    # Series polylines and dots.
    for s in series:
        coords = " ".join(f"{p.x:.2f},{p.y:.2f}" for p in s.points)
        lines.append(
            f'<polyline fill="none" stroke="{s.color}" stroke-width="2" points="{coords}"/>'
        )
        for p in s.points:
            lines.append(f'<circle cx="{p.x:.2f}" cy="{p.y:.2f}" r="3" fill="{s.color}" />')

    # Legend.
    legend_x = margin["left"]
    legend_y = margin["top"] + 12
    legend_gap = 120
    for idx, s in enumerate(series):
        lx = legend_x + idx * legend_gap
        lines.append(
            f'<rect x="{lx}" y="{legend_y - 10}" width="12" height="12" fill="{s.color}" rx="2"/>'
        )
        lines.append(f'<text class="legend" x="{lx + 18}" y="{legend_y + 0.5}">{s.label}</text>')

    lines.append(
        f'<text class="label" x="{margin["left"]}" y="20" font-size="14" '
        f'font-weight="bold">CI timing trend (last {len(records)} runs)</text>'
    )
    lines.append("</svg>")

    output.write_text("\n".join(lines))


def _render_empty_svg() -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="240" '
        'viewBox="0 0 900 240">'
        '<rect x="0" y="0" width="900" height="240" fill="#f8fafc" rx="6" />'
        '<text x="450" y="120" text-anchor="middle" '
        'font-family="Arial, sans-serif" font-size="18" fill="#0f172a">'
        "CI timing history will appear after the first successful main run.</text>"
        "</svg>"
    )


def main(argv: Iterable[str] | None = None) -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Render CI timing SVG from JSONL history.")
    parser.add_argument("input", type=Path, help="Path to ci_timings.jsonl")
    parser.add_argument("output", type=Path, help="Output SVG path")
    parser.add_argument("--max-points", type=int, default=60, help="Maximum runs to render")
    args = parser.parse_args(list(argv) if argv is not None else None)

    records = load_records(args.input)
    render_svg(records, args.output, max_points=args.max_points)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
