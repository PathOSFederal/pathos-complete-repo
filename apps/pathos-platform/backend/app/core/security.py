from __future__ import annotations

from fastapi import Header, HTTPException

from app.core.config import get_api_keys, runtime_env_allows_open_auth


def api_auth_required() -> bool:
    allowed_keys = get_api_keys()
    if allowed_keys:
        return True
    return not runtime_env_allows_open_auth()


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    allowed_keys = get_api_keys()
    if not allowed_keys:
        if runtime_env_allows_open_auth():
            return
        raise HTTPException(status_code=503, detail={"code": "CONFIG_VALIDATION_FAILED"})

    if authorization is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})

    token = authorization[len("Bearer ") :].strip()
    if not token:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})
    if token not in allowed_keys:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN"})
