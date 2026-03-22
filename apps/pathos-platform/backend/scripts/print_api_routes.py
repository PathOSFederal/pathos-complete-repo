"""Deterministic FastAPI route surface introspection.

WHY THIS FILE EXISTS:
- CI and planning tasks need a single source of truth for the active API surface.
- This script imports the app factory in openapi mode so route collection is safe
  even when runtime-only environment variables are missing.

WHAT THIS FILE DOES:
- Builds the FastAPI app with create_app(mode="openapi").
- Prints one line per route with stable columns:
  METHOD | PATH | NAME | SOURCE_MODULE

WHAT THIS FILE DOES NOT DO:
- It does not start an HTTP server.
- It does not execute handlers.
- It does not mutate database state.
"""

from __future__ import annotations

from pathlib import Path
import sys

from fastapi.routing import APIRoute

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _route_rows() -> list[tuple[str, str, str, str]]:
    from app.main import create_app

    app = create_app(mode="openapi")
    rows: list[tuple[str, str, str, str]] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        module = getattr(route.endpoint, "__module__", "unknown")
        methods = sorted(m for m in route.methods if m not in {"HEAD", "OPTIONS"})
        method_display = ",".join(methods)
        rows.append((method_display, route.path, route.name, module))
    rows.sort(key=lambda row: (row[1], row[0], row[2], row[3]))
    return rows


def main() -> None:
    print("METHOD|PATH|NAME|SOURCE_MODULE")
    for method, path, name, module in _route_rows():
        print(f"{method}|{path}|{name}|{module}")


if __name__ == "__main__":
    main()
