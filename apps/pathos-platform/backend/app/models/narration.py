from pydantic import BaseModel, Field


class NarrationCitation(BaseModel):
    reason_code: str | None = None
    evidence_ref: str | None = None


class NarrationOutput(BaseModel):
    headline: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    bullets: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    citations: list[NarrationCitation] = Field(default_factory=list)


def validate_narration_payload(payload: dict) -> NarrationOutput:
    return NarrationOutput.model_validate(payload)


def is_valid_narration_payload(payload: dict) -> bool:
    try:
        NarrationOutput.model_validate(payload)
        return True
    except Exception:
        return False
