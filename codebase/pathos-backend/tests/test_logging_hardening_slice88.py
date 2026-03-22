from __future__ import annotations

import ast
from pathlib import Path


def test_no_raw_print_calls_in_app_code() -> None:
    for path in Path("app").rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        module = ast.parse(source)
        for node in ast.walk(module):
            if not isinstance(node, ast.Call):
                continue
            if isinstance(node.func, ast.Name) and node.func.id == "print":
                assert False, f"Raw print call detected in {path}"


def test_no_unstructured_logger_exception_calls() -> None:
    for path in Path("app").rglob("*.py"):
        source = path.read_text(encoding="utf-8")
        assert ".exception(" not in source, f"logger.exception call detected in {path}"
