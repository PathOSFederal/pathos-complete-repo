from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.wipe_service import WipeService

router = APIRouter()


class WipeRequest(BaseModel):
    confirm: str
    wipe_threads: bool = False
    wipe_audits: bool = False


@router.post("/wipe")
def wipe_data(request: WipeRequest) -> dict:
    if request.confirm != "WIPE_ALL":
        raise HTTPException(status_code=400, detail={"code": "BAD_REQUEST"})
    return WipeService.wipe(wipe_threads=request.wipe_threads, wipe_audits=request.wipe_audits)
