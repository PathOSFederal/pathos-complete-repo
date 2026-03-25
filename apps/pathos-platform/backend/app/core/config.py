"""app.core.config

WHY THIS FILE EXISTS:
This module is the single source of truth for environment-driven runtime configuration.
Keeping parsing logic centralized avoids duplicated behavior and inconsistent defaults.

LAYER FIT:
- Core configuration utility layer used by adapters, services, and app bootstrap.

WHAT THIS FILE MUST NOT DO:
- Must not perform network requests.
- Must not perform database mutations.
- Must not depend on FastAPI request objects.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root: app/core/config.py -> app -> repo root
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = PROJECT_ROOT / ".env"
LOCAL_RUNTIME_ENVS = {"local", "dev", "test", "ci"}
RUNTIME_ENV_ALIASES = {
    "prod": "production",
    "production": "production",
    "stage": "staging",
    "staging": "staging",
    "local": "local",
    "dev": "dev",
    "test": "test",
    "ci": "ci",
    "unknown": "unknown",
}


def _parse_int(value: str, fallback: int, minimum: int) -> int:
    """Parse integer values with deterministic fallback and lower bound."""
    try:
        parsed = int(value)
    except ValueError:
        return fallback
    if parsed < minimum:
        return minimum
    return parsed


def _parse_float(value: str, fallback: float, minimum: float) -> float:
    """Parse float values with deterministic fallback and lower bound."""
    try:
        parsed = float(value)
    except ValueError:
        return fallback
    if parsed < minimum:
        return minimum
    return parsed


def normalize_runtime_env(value: str | None) -> str:
    if value is None:
        return "local"
    normalized = value.strip().lower()
    if not normalized:
        return "local"
    return RUNTIME_ENV_ALIASES.get(normalized, normalized)


class Settings(BaseSettings):
    """In-memory representation of environment-derived runtime settings.

    Loads from repo-root .env via absolute path so configuration is reliable
    on Windows and under uvicorn --reload (regardless of cwd).
    USAJOBS_API_KEY and USAJOBS_USER_AGENT may be empty; the USAJOBS adapter
    raises a controlled config error so the API returns 503 with a clear message.
    """

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    USAJOBS_API_KEY: str = Field("")
    USAJOBS_USER_AGENT: str = Field("")
    USAJOBS_HOST: str = "data.usajobs.gov"
    USAJOBS_API_BASE_URL: str = "https://data.usajobs.gov"
    USAJOBS_TIMEOUT_SECONDS: float = 10.0
    USAJOBS_CACHE_TTL_SECONDS: int = 60
    AUDIT_LOG_RAW_UPSTREAM: bool = False
    AUDIT_MAX_UPSTREAM_BYTES: int = 262144
    PATHOS_API_KEYS_RAW: str = Field("", validation_alias="PATHOS_API_KEYS")
    PATHOS_CORS_ORIGINS_RAW: str = Field("", validation_alias="PATHOS_CORS_ORIGINS")
    PATHOS_ENV: str = "local"
    PATHOS_BASE_URL: str = "/api/v1"
    PATHOS_LOG_LEVEL: str = "INFO"
    PATHOS_RATE_LIMIT_ENABLED: bool = False
    PATHOS_RATE_LIMIT_RPM: int = 120
    ALERT_RULE_MIN_INTERVAL_MINUTES: int = 60
    ALERT_RUN_MAX_JOBS_SCANNED: int = 500
    ALERT_GLOBAL_RULES_PER_RUN: int = 50
    ALERT_RUN_LOCK_TTL_SECONDS: int = 3900
    PATHOS_WORKER_INTERVAL_SECONDS: int = 3600
    PATHOS_WORKER_MAX_RUN_SECONDS: int = 3500
    PATHOS_WORKER_MAX_JOBS_SCANNED: int = 500
    PATHOS_WORKER_MAX_RULES_EVALUATED: int = 50
    WORKER_ENABLED: bool = True
    ALERTS_EVALUATION_ENABLED: bool = True
    ALERTS_DELIVERY_ENABLED: bool = True
    DRY_RUN_MODE: bool = False
    PAUSE_REASON: str = ""
    RETENTION_DAYS_AUDIT: int = 90
    RETENTION_DAYS_DIGESTS: int = 90
    RETENTION_DAYS_THREAD_SUMMARIES: int = 90
    RETENTION_DAYS_UPSTREAM_RAW: int = 90
    TELEMETRY_ENABLED: bool = False
    DB_DIALECT: str = "sqlite"
    DATABASE_URL: str = Field("")
    PATHOS_DB_PATH: str = "data/pathos.db"

    @field_validator(
        "USAJOBS_API_KEY",
        "USAJOBS_USER_AGENT",
        "USAJOBS_TIMEOUT_SECONDS",
        "USAJOBS_CACHE_TTL_SECONDS",
        "AUDIT_MAX_UPSTREAM_BYTES",
        "PATHOS_LOG_LEVEL",
        "PATHOS_RATE_LIMIT_RPM",
        "ALERT_RULE_MIN_INTERVAL_MINUTES",
        "ALERT_RUN_MAX_JOBS_SCANNED",
        "ALERT_GLOBAL_RULES_PER_RUN",
        "ALERT_RUN_LOCK_TTL_SECONDS",
        "PATHOS_WORKER_INTERVAL_SECONDS",
        "PATHOS_WORKER_MAX_RUN_SECONDS",
        "PATHOS_WORKER_MAX_JOBS_SCANNED",
        "PATHOS_WORKER_MAX_RULES_EVALUATED",
        "PAUSE_REASON",
        "RETENTION_DAYS_AUDIT",
        "RETENTION_DAYS_DIGESTS",
        "RETENTION_DAYS_THREAD_SUMMARIES",
        "RETENTION_DAYS_UPSTREAM_RAW",
        "DB_DIALECT",
        "DATABASE_URL",
        "PATHOS_DB_PATH",
        mode="before",
    )
    @classmethod
    def strip_strings(cls, v: str | float | int) -> str | float | int:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("PATHOS_RATE_LIMIT_RPM", mode="before")
    @classmethod
    def parse_rate_limit_rpm(cls, v: str | int) -> int:
        """Parse RPM with fallback 120 for invalid values (matches legacy _parse_int)."""
        if isinstance(v, int):
            return v
        try:
            return int(str(v).strip())
        except ValueError:
            return 120

    @field_validator("USAJOBS_TIMEOUT_SECONDS", mode="after")
    @classmethod
    def clamp_timeout(cls, v: float) -> float:
        return max(0.1, v) if v < 0.1 else v

    @field_validator(
        "USAJOBS_CACHE_TTL_SECONDS",
        "AUDIT_MAX_UPSTREAM_BYTES",
        "PATHOS_RATE_LIMIT_RPM",
        "ALERT_RULE_MIN_INTERVAL_MINUTES",
        "ALERT_RUN_MAX_JOBS_SCANNED",
        "ALERT_GLOBAL_RULES_PER_RUN",
        "ALERT_RUN_LOCK_TTL_SECONDS",
        "PATHOS_WORKER_INTERVAL_SECONDS",
        "PATHOS_WORKER_MAX_RUN_SECONDS",
        "PATHOS_WORKER_MAX_JOBS_SCANNED",
        "PATHOS_WORKER_MAX_RULES_EVALUATED",
        "RETENTION_DAYS_AUDIT",
        "RETENTION_DAYS_DIGESTS",
        "RETENTION_DAYS_THREAD_SUMMARIES",
        "RETENTION_DAYS_UPSTREAM_RAW",
        mode="after",
    )
    @classmethod
    def clamp_positive_int(cls, v: int, info) -> int:
        minimum = 1
        if info.field_name == "AUDIT_MAX_UPSTREAM_BYTES":
            minimum = 1024
        return max(minimum, v) if v < minimum else v

    @field_validator(
        "AUDIT_LOG_RAW_UPSTREAM",
        "PATHOS_RATE_LIMIT_ENABLED",
        "WORKER_ENABLED",
        "ALERTS_EVALUATION_ENABLED",
        "ALERTS_DELIVERY_ENABLED",
        "DRY_RUN_MODE",
        "TELEMETRY_ENABLED",
        mode="before",
    )
    @classmethod
    def parse_bool(cls, v: str | bool) -> bool:
        if isinstance(v, bool):
            return v
        return str(v).strip().lower() == "true"

    @field_validator("DB_DIALECT", mode="before")
    @classmethod
    def normalize_db_dialect(cls, v: str) -> str:
        if not isinstance(v, str):
            return "sqlite"
        value = v.strip().lower()
        if value in {"sqlite", "postgres"}:
            return value
        return "sqlite"

    @field_validator("PATHOS_ENV", mode="before")
    @classmethod
    def normalize_pathos_env(cls, v: str) -> str:
        if not isinstance(v, str):
            return "local"
        return normalize_runtime_env(v)


def _load_settings() -> Settings:
    """Load settings from env_file (and env vars). Used for singleton and refresh."""
    return Settings()  # type: ignore[call-arg]


settings: Settings = _load_settings()


def refresh_settings() -> Settings:
    """Reload settings from repo-root .env and current process environment.

    WHY THIS FUNCTION EXISTS:
    - Tests use monkeypatch.setenv between app/client constructions.
    - Re-creates Settings with same env_file so .env is re-read when needed.
    """
    global settings
    settings = _load_settings()
    return settings


def get_usajobs_api_key() -> str:
    """Return USAJOBS API key (validated non-empty at load time)."""
    refresh_settings()
    return settings.USAJOBS_API_KEY


def get_api_keys() -> set[str]:
    """Return configured API keys as a normalized set."""
    refresh_settings()
    raw_value = settings.PATHOS_API_KEYS_RAW
    if not raw_value:
        return set()
    keys = {item.strip() for item in raw_value.split(",")}
    return {key for key in keys if key}


def get_cors_origins() -> list[str]:
    """Return explicit CORS allowlist values, never wildcard."""
    refresh_settings()
    raw_value = settings.PATHOS_CORS_ORIGINS_RAW
    if not raw_value:
        return []
    origins = [item.strip() for item in raw_value.split(",")]
    return [origin for origin in origins if origin and origin != "*"]


def get_runtime_env() -> str:
    """Return runtime environment label used by desktop contract responses."""
    refresh_settings()
    return normalize_runtime_env(settings.PATHOS_ENV)


def runtime_env_allows_open_auth(runtime_env: str | None = None) -> bool:
    resolved_env = normalize_runtime_env(
        runtime_env if runtime_env is not None else get_runtime_env()
    )
    return resolved_env in LOCAL_RUNTIME_ENVS


def runtime_env_allows_placeholder_runtime(runtime_env: str | None = None) -> bool:
    resolved_env = normalize_runtime_env(
        runtime_env if runtime_env is not None else get_runtime_env()
    )
    return resolved_env in LOCAL_RUNTIME_ENVS


def get_base_url() -> str:
    """Return advertised base API URL for desktop contract metadata."""
    refresh_settings()
    return settings.PATHOS_BASE_URL


def get_log_level() -> str:
    """Return runtime log level label for JSON logger configuration."""
    refresh_settings()
    return settings.PATHOS_LOG_LEVEL


def get_rate_limit_enabled() -> bool:
    """Return whether in-memory rate limiting is enabled."""
    refresh_settings()
    return settings.PATHOS_RATE_LIMIT_ENABLED


def get_rate_limit_rpm() -> int:
    """Return configured rate-limit RPM with deterministic fallback bounds."""
    refresh_settings()
    return settings.PATHOS_RATE_LIMIT_RPM


def get_alert_rule_min_interval_minutes() -> int:
    """Minimum interval between runs for the same rule."""
    refresh_settings()
    return settings.ALERT_RULE_MIN_INTERVAL_MINUTES


def get_alert_run_max_jobs_scanned() -> int:
    """Global cap on jobs scanned in one alerts run."""
    refresh_settings()
    return settings.ALERT_RUN_MAX_JOBS_SCANNED


def get_alert_global_rules_per_run() -> int:
    """Global cap on enabled rules processed per alerts run."""
    refresh_settings()
    return settings.ALERT_GLOBAL_RULES_PER_RUN


def get_alert_run_lock_ttl_seconds() -> int:
    """TTL for DB-backed scheduler lock rows."""
    refresh_settings()
    return settings.ALERT_RUN_LOCK_TTL_SECONDS


def get_worker_interval_seconds() -> int:
    """Worker scheduler interval in seconds."""
    refresh_settings()
    return settings.PATHOS_WORKER_INTERVAL_SECONDS


def get_worker_max_run_seconds() -> int:
    """Worker hard ceiling for a single scheduler run duration."""
    refresh_settings()
    return settings.PATHOS_WORKER_MAX_RUN_SECONDS


def get_worker_max_jobs_scanned() -> int:
    """Worker hard ceiling for jobs scanned in a single scheduler run."""
    refresh_settings()
    return settings.PATHOS_WORKER_MAX_JOBS_SCANNED


def get_worker_max_rules_evaluated() -> int:
    """Worker hard ceiling for rules evaluated in a single scheduler run."""
    refresh_settings()
    return settings.PATHOS_WORKER_MAX_RULES_EVALUATED


def get_worker_enabled() -> bool:
    """Return whether worker execution is globally enabled."""
    refresh_settings()
    return settings.WORKER_ENABLED


def get_alerts_evaluation_enabled() -> bool:
    """Return whether alert evaluation is enabled for worker runs."""
    refresh_settings()
    return settings.ALERTS_EVALUATION_ENABLED


def get_alerts_delivery_enabled() -> bool:
    """Return whether digest/delivery side effects are enabled."""
    refresh_settings()
    return settings.ALERTS_DELIVERY_ENABLED


def get_dry_run_mode() -> bool:
    """Return whether alert runs should avoid delivery side effects."""
    refresh_settings()
    return settings.DRY_RUN_MODE


def get_pause_reason() -> str | None:
    """Return configured operator pause reason when present."""
    refresh_settings()
    value = settings.PAUSE_REASON.strip()
    return value if value else None


def get_retention_days_audit() -> int:
    """Return retention window in days for audit records."""
    refresh_settings()
    return settings.RETENTION_DAYS_AUDIT


def get_retention_days_digests() -> int:
    """Return retention window in days for alert digests/runs."""
    refresh_settings()
    return settings.RETENTION_DAYS_DIGESTS


def get_retention_days_thread_summaries() -> int:
    """Return retention window in days for persisted thread summaries."""
    refresh_settings()
    return settings.RETENTION_DAYS_THREAD_SUMMARIES


def get_retention_days_upstream_raw() -> int:
    """Return retention window in days for upstream raw payload audit rows."""
    refresh_settings()
    return settings.RETENTION_DAYS_UPSTREAM_RAW


def get_telemetry_enabled() -> bool:
    """Return whether telemetry collection is enabled."""
    refresh_settings()
    return settings.TELEMETRY_ENABLED


def get_usajobs_api_base_url() -> str:
    """Return the USAJOBS API base URL used by adapter client."""
    refresh_settings()
    return settings.USAJOBS_API_BASE_URL


def get_usajobs_host() -> str:
    """Return the USAJOBS host header value."""
    refresh_settings()
    return settings.USAJOBS_HOST


def get_usajobs_user_agent() -> str:
    """Return USAJOBS user-agent identity required by official API."""
    refresh_settings()
    return settings.USAJOBS_USER_AGENT


def get_usajobs_timeout_seconds() -> float:
    """Return outbound timeout used by USAJOBS adapter client."""
    refresh_settings()
    return settings.USAJOBS_TIMEOUT_SECONDS


def get_usajobs_cache_ttl_seconds() -> int:
    """Return cache TTL used by job search service."""
    refresh_settings()
    return settings.USAJOBS_CACHE_TTL_SECONDS


def get_audit_log_raw_upstream() -> bool:
    """Return whether raw upstream payload snippets should be stored in audit logs."""
    refresh_settings()
    return settings.AUDIT_LOG_RAW_UPSTREAM


def get_audit_max_upstream_bytes() -> int:
    """Return deterministic byte cap for upstream payload storage."""
    refresh_settings()
    return settings.AUDIT_MAX_UPSTREAM_BYTES


def get_db_dialect() -> str:
    """Return active database dialect (sqlite or postgres)."""
    refresh_settings()
    return settings.DB_DIALECT


def get_database_url() -> str:
    """Return configured DATABASE_URL for postgres connections (may be empty)."""
    refresh_settings()
    return settings.DATABASE_URL


def _normalize_sqlalchemy_postgres_url(database_url: str) -> str:
    """Force SQLAlchemy/Alembic to use psycopg v3 when no driver is specified."""
    if database_url.startswith("postgresql+psycopg://"):
        return database_url
    if database_url.startswith("postgresql://"):
        return f"postgresql+psycopg://{database_url[len('postgresql://') :]}"
    if database_url.startswith("postgres://"):
        return f"postgresql+psycopg://{database_url[len('postgres://') :]}"
    return database_url


def get_sqlalchemy_database_url() -> str:
    """Return SQLAlchemy URL for migration tooling using the app config contract."""
    refresh_settings()
    if settings.DB_DIALECT == "postgres":
        if not settings.DATABASE_URL:
            raise ValueError("DATABASE_URL must be set when DB_DIALECT=postgres")
        # Alembic/SQLAlchemy must use the psycopg v3 driver to avoid psycopg2 imports.
        return _normalize_sqlalchemy_postgres_url(settings.DATABASE_URL)

    db_path = Path(settings.PATHOS_DB_PATH).expanduser()
    if not db_path.is_absolute():
        db_path = PROJECT_ROOT / db_path
    return f"sqlite:///{db_path.as_posix()}"
