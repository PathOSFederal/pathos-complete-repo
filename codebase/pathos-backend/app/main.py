"""app.main

WHY THIS FILE EXISTS:
This module builds the FastAPI application and wires middleware plus routers.

LAYER FIT:
- Application bootstrap/wiring layer.

WHAT THIS FILE MUST NOT DO:
- Must not embed business logic that belongs in service/engine layers.
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.advisor import router as advisor_router
from app.api.v1.advisor_session import router as advisor_session_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.audit import router as audit_router
from app.api.v1.desktop import router as desktop_router
from app.api.v1.diagnostics import router as diagnostics_router
from app.api.v1.export import router as export_router
from app.api.v1.health import router as health_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.meta import router as meta_router
from app.api.v1.ops import router as ops_router
from app.api.v1.profile_v1 import router as profile_router
from app.api.v1.saved_searches import router as saved_searches_router
from app.api.v1.thread_summary import router as thread_summary_router
from app.api.v1.threads import router as threads_router
from app.api.v1.wipe import router as wipe_router
from app.core.config import (
    get_cors_origins,
    get_log_level,
    get_rate_limit_enabled,
    get_rate_limit_rpm,
    refresh_settings,
)
from app.core.error_handlers import register_error_handlers
from app.core.logging import configure_logging
from app.core.readiness import ensure_database_ready
from app.core.security import require_api_key
from app.core.startup_validation import StartupMode, validate_startup_config
from app.db.connection import get_db_path, init_db
from app.middleware.rate_limit import create_rate_limit_middleware
from app.middleware.request_id import request_id_middleware
from app.services.job_search_service import JobSearchService


@asynccontextmanager
async def _app_lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Run startup readiness checks without deprecated event hooks."""
    ensure_database_ready(db_path=get_db_path())
    init_db()
    yield


def create_app(mode: StartupMode = "api") -> FastAPI:
    # Refresh env-backed settings so test-time monkeypatch values are respected.
    refresh_settings()
    configure_logging(get_log_level())
    validate_startup_config(mode=mode)
    JobSearchService.clear_cache()
    app = FastAPI(title="PathOS Backend", version="0.1.0", lifespan=_app_lifespan)

    cors_origins = get_cors_origins()
    if cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=False,
            allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
            allow_headers=["Authorization", "Content-Type"],
        )

    app.middleware("http")(request_id_middleware)
    app.middleware("http")(
        create_rate_limit_middleware(
            enabled=get_rate_limit_enabled(),
            rpm=get_rate_limit_rpm(),
        )
    )
    register_error_handlers(app)

    app.include_router(health_router)
    app.include_router(health_router, prefix="/api/v1")
    app.include_router(
        advisor_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        audit_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        jobs_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        export_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        threads_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        thread_summary_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        saved_searches_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        alerts_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        profile_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        wipe_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        desktop_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        diagnostics_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        ops_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        meta_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )
    app.include_router(
        advisor_session_router,
        prefix="/api/v1",
        dependencies=[Depends(require_api_key)],
    )
    app.include_router(
        intelligence_router, prefix="/api/v1", dependencies=[Depends(require_api_key)]
    )

    return app
