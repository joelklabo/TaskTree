import json
from pathlib import Path

from tasktree.ci_metrics.render import load_records, render_svg


def _sample_records() -> list[dict]:
    return [
        {
            "run_id": 1,
            "run_number": 101,
            "total_duration_ms": 60000,
            "sha": "abc1234",
            "jobs": [
                {"name": "Backend Pipeline", "duration_ms": 20000},
                {"name": "Frontend Pipeline", "duration_ms": 30000},
                {"name": "Actionlint", "duration_ms": 10000},
            ],
        },
        {
            "run_id": 2,
            "run_number": 102,
            "total_duration_ms": 90000,
            "sha": "def5678",
            "jobs": [
                {"name": "Backend Pipeline", "duration_ms": 30000},
                {"name": "Frontend Pipeline", "duration_ms": 40000},
                {"name": "Docs job", "duration_ms": 20000},
            ],
        },
    ]


def test_render_svg_writes_chart(tmp_path: Path) -> None:
    out = tmp_path / "chart.svg"
    records = _sample_records()
    render_svg(records, out)

    content = out.read_text()
    assert content.startswith("<svg")
    assert "Total CI runtime" in content
    assert "Backend job" in content
    assert "Frontend job" in content


def test_load_records_ignores_bad_lines(tmp_path: Path) -> None:
    path = tmp_path / "data.jsonl"
    payload = _sample_records()
    path.write_text(f"{json.dumps(payload[0])}\nnot json\n{json.dumps(payload[1])}\n")

    recs = load_records(path)
    assert len(recs) == 2
    assert recs[0]["run_id"] == 1
    assert recs[1]["run_id"] == 2
