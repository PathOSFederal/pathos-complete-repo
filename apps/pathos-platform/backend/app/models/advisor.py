from datetime import datetime

from pydantic import BaseModel, Field

from app.models.common import ConfidenceBand, Recommendation
from app.models.job import NormalizedJob
from app.models.profile import UserProfileSnapshot


class EvidenceRef(BaseModel):
    source: str = Field(min_length=1)
    pointer: str | None = None


class ReasonItem(BaseModel):
    code: str | None = None
    text: str = Field(min_length=1)
    evidence_refs: list[EvidenceRef] = Field(default_factory=list)


class RiskItem(BaseModel):
    code: str | None = None
    text: str = Field(min_length=1)
    mitigation: str | None = None


class NextActionItem(BaseModel):
    code: str | None = None
    action: str = Field(min_length=1)
    priority: int = Field(default=1, ge=1, le=5)


class AdvisorMeta(BaseModel):
    policy_version: str = Field(default="v1", min_length=1)
    engine_version: str | None = None
    ruleset_version: str | None = None
    trace_id: str | None = None
    input_hash: str | None = None
    generated_at: datetime | None = None


class AdvisorInput(BaseModel):
    profile: UserProfileSnapshot
    job: NormalizedJob
    user_notes: str | None = None


class AdvisorOutput(BaseModel):
    recommendation: Recommendation
    confidence_band: ConfidenceBand
    reasons: list[ReasonItem] = Field(default_factory=list)
    risks: list[RiskItem] = Field(default_factory=list)
    next_actions: list[NextActionItem] = Field(default_factory=list)
    evidence: list[EvidenceRef] = Field(default_factory=list)
    meta: AdvisorMeta = Field(default_factory=AdvisorMeta)
