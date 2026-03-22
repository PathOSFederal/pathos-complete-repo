"""Unit tests for app.core.config.

Verify USAJOBS config: when env vars are present, getters return them;
when missing or empty, getters return empty string (API returns 503 on use).
Uses monkeypatch only; no real .env file required.
"""

from __future__ import annotations

from app.core.config import (
    get_usajobs_api_base_url,
    get_usajobs_api_key,
    get_usajobs_user_agent,
    refresh_settings,
)


def test_config_usajobs_returns_values_from_env(monkeypatch) -> None:
    """When USAJOBS_API_KEY and USAJOBS_USER_AGENT are set, getters return them."""
    monkeypatch.setenv("USAJOBS_API_KEY", "my-secret-key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "MyApp (contact@example.com)")
    monkeypatch.setenv("USAJOBS_API_BASE_URL", "https://custom.usajobs.gov")
    refresh_settings()
    assert get_usajobs_api_key() == "my-secret-key"
    assert get_usajobs_user_agent() == "MyApp (contact@example.com)"
    assert get_usajobs_api_base_url() == "https://custom.usajobs.gov"


def test_config_empty_api_key_returns_empty_string(monkeypatch) -> None:
    """Empty USAJOBS_API_KEY causes getter to return empty string (no ValidationError)."""
    monkeypatch.setenv("USAJOBS_API_KEY", "")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "valid-ua@example.com")
    refresh_settings()
    assert get_usajobs_api_key() == ""


def test_config_empty_user_agent_returns_empty_string(monkeypatch) -> None:
    """Empty USAJOBS_USER_AGENT causes getter to return empty string (no ValidationError)."""
    monkeypatch.setenv("USAJOBS_API_KEY", "valid-key")
    monkeypatch.setenv("USAJOBS_USER_AGENT", "")
    refresh_settings()
    assert get_usajobs_user_agent() == ""
