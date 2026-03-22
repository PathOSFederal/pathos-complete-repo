from __future__ import annotations

import importlib
import sys


def test_import_app_main_does_not_run_startup_validation(monkeypatch) -> None:
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    calls: list[str] = []

    def _fake_validate_startup_config(*, mode, emit_success_event=True):  # noqa: ANN001
        del emit_success_event
        calls.append(str(mode))

    monkeypatch.setattr("app.core.startup_validation.validate_startup_config", _fake_validate_startup_config)
    sys.modules.pop("app.main", None)
    importlib.import_module("app.main")
    assert calls == []
