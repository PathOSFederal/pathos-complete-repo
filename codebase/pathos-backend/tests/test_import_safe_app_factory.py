from __future__ import annotations

import importlib
import sys
import warnings

from fastapi.testclient import TestClient


def test_importing_app_main_has_no_runtime_side_effects(monkeypatch, tmp_path) -> None:
    db_path = tmp_path / "import_safe.db"
    monkeypatch.setenv("PATHOS_DB_PATH", str(db_path))
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")

    sys.modules.pop("app.main", None)
    module = importlib.import_module("app.main")

    assert hasattr(module, "create_app")
    assert not hasattr(module, "app")
    assert not db_path.exists()


def test_create_app_startup_emits_no_on_event_deprecation_warning(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("PATHOS_DB_PATH", str(tmp_path / "lifespan.db"))
    monkeypatch.delenv("PATHOS_API_KEYS", raising=False)

    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        module = importlib.import_module("app.main")
        app = module.create_app()
        with TestClient(app):
            pass

    assert not any("on_event" in str(item.message) for item in caught)
