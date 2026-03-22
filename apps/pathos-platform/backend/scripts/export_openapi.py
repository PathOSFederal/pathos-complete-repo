from __future__ import annotations

import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def build_openapi_snapshot() -> dict:
    from app.main import create_app

    app = create_app(mode="openapi")
    return app.openapi()


def canonicalize_openapi(spec: dict) -> str:
    return json.dumps(spec, indent=2, sort_keys=True)


def write_openapi_snapshot(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    spec = build_openapi_snapshot()
    content = canonicalize_openapi(spec)

    # Force deterministic trailing newline
    if not content.endswith("\n"):
        content += "\n"

    # Write as raw bytes to avoid CRLF transformation
    output_path.write_bytes(content.encode("utf-8"))

def main() -> None:
    output_path = Path("artifacts") / "contracts" / "openapi.json"
    write_openapi_snapshot(output_path)


if __name__ == "__main__":
    main()
