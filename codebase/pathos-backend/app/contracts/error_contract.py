from pydantic import BaseModel, Field

from app.core.error_codes import ErrorCategory


class ErrorCorrelation(BaseModel):
    request_id: str
    run_id: str | None = None
    rule_id: str | None = None
    saved_search_id: str | None = None

class ErrorBody(BaseModel):
    code: str
    message: str
    category: ErrorCategory
    correlation: ErrorCorrelation


class ErrorResponse(BaseModel):
    error: ErrorBody = Field(...)
