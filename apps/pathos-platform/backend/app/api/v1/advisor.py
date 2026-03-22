from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Literal

from app.models.advisor import AdvisorInput, AdvisorOutput
from app.models.narration import NarrationOutput
from app.services.advisor_service import AdvisorService
from app.services.narration_service import NarrationService

router = APIRouter()


@router.post("/advisor/evaluate", response_model=AdvisorOutput)
def evaluate_advisor(advisor_input: AdvisorInput) -> AdvisorOutput:
    return AdvisorService.evaluate(advisor_input)


class NarrateRequest(BaseModel):
    evaluation: AdvisorOutput
    tone: Literal["default", "direct", "supportive"] | None = Field(default=None)


class NarrateResponse(BaseModel):
    narration: NarrationOutput
    narration_mode: str


class EvaluateAndNarrateRequest(BaseModel):
    advisor_input: AdvisorInput
    tone: Literal["default", "direct", "supportive"] | None = Field(default=None)


class EvaluateAndNarrateResponse(BaseModel):
    evaluation: AdvisorOutput
    narration: NarrationOutput
    narration_mode: str


@router.post("/advisor/narrate", response_model=NarrateResponse)
def narrate_advisor(request: NarrateRequest) -> NarrateResponse:
    narration, narration_mode = NarrationService.narrate(evaluation=request.evaluation, tone=request.tone)
    return NarrateResponse(narration=narration, narration_mode=narration_mode)


@router.post("/advisor/evaluate-and-narrate", response_model=EvaluateAndNarrateResponse)
def evaluate_and_narrate(request: EvaluateAndNarrateRequest) -> EvaluateAndNarrateResponse:
    evaluation = AdvisorService.evaluate(request.advisor_input)
    narration, narration_mode = NarrationService.narrate(evaluation=evaluation, tone=request.tone)
    return EvaluateAndNarrateResponse(evaluation=evaluation, narration=narration, narration_mode=narration_mode)
