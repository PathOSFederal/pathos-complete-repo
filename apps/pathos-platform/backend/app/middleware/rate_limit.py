from __future__ import annotations

import time
from collections import defaultdict, deque
from uuid import uuid4

from fastapi import Request

from app.core.error_handlers import build_canonical_error_response
from app.core.request_context import set_request_id


def create_rate_limit_middleware(enabled: bool, rpm: int):
    buckets: dict[str, deque[float]] = defaultdict(deque)
    window_seconds = 60.0

    def _request_id(request: Request) -> str:
        existing = getattr(request.state, "request_id", None)
        if existing:
            set_request_id(str(existing))
            return str(existing)
        generated = str(uuid4())
        request.state.request_id = generated
        set_request_id(generated)
        return generated

    def _identifier(request: Request) -> str:
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            token = authorization[len("Bearer ") :].strip()
            if token:
                return f"key:{token}"
        client = request.client.host if request.client else "unknown"
        return f"ip:{client}"

    def _route_group(path: str) -> str:
        suffix = path[len("/api/v1/") :]
        if not suffix:
            return "root"
        return suffix.split("/", 1)[0]

    async def middleware(request: Request, call_next):
        path = request.url.path
        if not enabled or not path.startswith("/api/v1/") or path == "/api/v1/health":
            return await call_next(request)

        group = _route_group(path)
        key = f"{_identifier(request)}:{group}"
        now = time.monotonic()
        bucket = buckets[key]
        while bucket and now - bucket[0] >= window_seconds:
            bucket.popleft()
        if len(bucket) >= rpm:
            request_id = _request_id(request)
            return build_canonical_error_response(status_code=429, request_id=request_id, explicit_code="RATE_LIMITED")

        bucket.append(now)
        return await call_next(request)

    return middleware
