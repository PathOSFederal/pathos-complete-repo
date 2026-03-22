from datetime import datetime

from pydantic import BaseModel


class BackendInfo(BaseModel):
    version: str
    env: str
    authRequired: bool
    baseUrl: str
    serverTime: datetime


class PingResponse(BaseModel):
    status: str
