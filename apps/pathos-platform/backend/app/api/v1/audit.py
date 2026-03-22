from fastapi import APIRouter, HTTPException, Query

from app.services.audit_service import AuditNotFoundError, AuditService

router = APIRouter()


@router.get("/audit/recent")
def get_recent_audits(limit: int = Query(default=50, ge=1, le=200)) -> list[dict]:
    return AuditService.list_recent(limit=limit)


@router.get("/audit/{trace_id}")
def get_audit(trace_id: str) -> dict:
    try:
        return AuditService.get_audit(trace_id)
    except AuditNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc


@router.delete("/audit/{trace_id}")
def delete_audit(trace_id: str) -> dict:
    try:
        AuditService.delete_audit(trace_id)
        return {"deleted": True, "trace_id": trace_id}
    except AuditNotFoundError as exc:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"}) from exc
