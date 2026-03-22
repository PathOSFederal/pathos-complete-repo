from __future__ import annotations

from fastapi import Header, HTTPException

from app.core.config import get_api_keys


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    allowed_keys = get_api_keys()
    if not allowed_keys:
        return

    if authorization is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})

    token = authorization[len("Bearer ") :].strip()
    if not token:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED"})
    if token not in allowed_keys:
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN"})
