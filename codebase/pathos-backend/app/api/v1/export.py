from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.diagnostics import ExportIntegrityOut
from app.services.audit_service import AuditNotFoundError
from app.services.export_service import ExportService
from app.services.thread_service import ThreadNotFoundError

router = APIRouter()


@router.get("/export/thread/{thread_id}", response_model=ExportIntegrityOut)
def export_thread(thread_id: str) -> dict:
    try:
        return ExportService.export_thread(thread_id=thread_id)
    except ThreadNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc


@router.get("/export/audit/{trace_id}", response_model=ExportIntegrityOut)
def export_audit(trace_id: str) -> dict:
    try:
        return ExportService.export_audit(trace_id=trace_id)
    except AuditNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc


@router.get("/export/recent", response_model=ExportIntegrityOut)
def export_recent(limit: int = Query(default=20, ge=1, le=200)) -> dict:
    return ExportService.export_recent(limit=limit)
