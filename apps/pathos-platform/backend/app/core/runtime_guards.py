from __future__ import annotations

from fastapi import HTTPException

from app.core.config import get_runtime_env, runtime_env_allows_placeholder_runtime


def require_placeholder_runtime_allowed(*, feature_name: str) -> None:
    runtime_env = get_runtime_env()
    if runtime_env_allows_placeholder_runtime(runtime_env):
        return
    raise HTTPException(
        status_code=503,
        detail={
            "code": "FEATURE_NOT_READY",
            "feature": feature_name,
            "runtime_env": runtime_env,
        },
    )
