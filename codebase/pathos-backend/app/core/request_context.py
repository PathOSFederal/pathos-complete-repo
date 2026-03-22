"""Correlation context helpers for request/run scoped logging."""

from __future__ import annotations

from contextvars import ContextVar

_request_id_ctx: ContextVar[str | None] = ContextVar("request_id", default=None)
_run_id_ctx: ContextVar[str | None] = ContextVar("run_id", default=None)
_worker_run_id_ctx: ContextVar[str | None] = ContextVar("worker_run_id", default=None)
_rule_id_ctx: ContextVar[str | None] = ContextVar("rule_id", default=None)
_saved_search_id_ctx: ContextVar[str | None] = ContextVar(
    "saved_search_id", default=None
)


def set_request_id(request_id: str | None) -> None:
    _request_id_ctx.set(request_id)


def get_request_id() -> str | None:
    return _request_id_ctx.get()


def set_run_id(run_id: str | None) -> None:
    _run_id_ctx.set(run_id)


def get_run_id() -> str | None:
    return _run_id_ctx.get()


def set_worker_run_id(worker_run_id: str | None) -> None:
    _worker_run_id_ctx.set(worker_run_id)


def get_worker_run_id() -> str | None:
    return _worker_run_id_ctx.get()


def set_rule_id(rule_id: str | None) -> None:
    _rule_id_ctx.set(rule_id)


def get_rule_id() -> str | None:
    return _rule_id_ctx.get()


def set_saved_search_id(saved_search_id: str | None) -> None:
    _saved_search_id_ctx.set(saved_search_id)


def get_saved_search_id() -> str | None:
    return _saved_search_id_ctx.get()


def clear_context() -> None:
    set_request_id(None)
    set_run_id(None)
    set_worker_run_id(None)
    set_rule_id(None)
    set_saved_search_id(None)
