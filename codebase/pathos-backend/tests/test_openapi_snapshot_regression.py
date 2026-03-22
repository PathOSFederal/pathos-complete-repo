import json
from pathlib import Path

from scripts.export_openapi import build_openapi_snapshot, canonicalize_openapi


def test_openapi_snapshot_is_deterministic_and_matches_golden() -> None:
    first = canonicalize_openapi(build_openapi_snapshot())
    second = canonicalize_openapi(build_openapi_snapshot())

    assert first == second

    golden_path = Path("artifacts") / "contracts" / "openapi.json"
    assert golden_path.exists()

    golden_payload = json.loads(golden_path.read_text(encoding="utf-8"))
    golden = canonicalize_openapi(golden_payload)
    assert first == golden
