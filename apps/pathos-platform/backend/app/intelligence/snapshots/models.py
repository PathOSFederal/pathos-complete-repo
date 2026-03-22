"""Snapshot contract models for deterministic intelligence endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


SnapshotKind = Literal[
    "career_readiness",
    "resume_readiness",
    "job_match",
    "application_confidence",
]


class SnapshotMeta(BaseModel):
    snapshot_id: str
    generated_at: datetime
    input_hash: str
    rule_version: str
    knowledge_pack_version: str
    kind: SnapshotKind


class EvidenceRef(BaseModel):
    key: str
    label: str
    source_type: Literal[
        "profile_field",
        "resume_section",
        "resume_bullet",
        "job_field",
        "system_rule",
    ]
    source_ref: str | None = None


class MissingEvidence(BaseModel):
    key: str
    label: str
    why_it_matters: str | None = None


class ReasonItem(BaseModel):
    code: str
    message: str
    weight: float | None = None


class CareerReadinessRequest(BaseModel):
    user_profile: dict[str, Any]
    target_role: str
    resume_id: str | None = None


class ResumeReadinessRequest(BaseModel):
    resume_text: str | None = None
    resume_id: str | None = None
    target_role: str

    @model_validator(mode="after")
    def validate_resume_input(self) -> "ResumeReadinessRequest":
        has_resume_text = (
            self.resume_text is not None and self.resume_text.strip() != ""
        )
        has_resume_id = self.resume_id is not None and self.resume_id.strip() != ""
        if not has_resume_text and not has_resume_id:
            raise ValueError("Either resume_text or resume_id must be provided.")
        return self


class JobMatchRequest(BaseModel):
    user_profile: dict[str, Any]
    job: dict[str, Any]
    target_role: str | None = None


class TopGapItem(BaseModel):
    key: str
    title: str
    impact_points: int = Field(ge=0, le=100)
    reason: str


class ActionPlanItem(BaseModel):
    key: str
    title: str
    impact_points: int = Field(ge=0, le=100)
    effort: Literal["S", "M", "L"]
    helper: str


class CareerReadinessSnapshot(BaseModel):
    meta: SnapshotMeta
    overall_score: int = Field(ge=0, le=100)
    label: str
    target_role: str
    spokes: dict[str, int]
    top_gaps: list[TopGapItem]
    action_plan: list[ActionPlanItem]
    reasons: list[ReasonItem]
    evidence_used: list[EvidenceRef]
    missing_evidence: list[MissingEvidence]


class ResumeSuggestionItem(BaseModel):
    key: str
    title: str
    impact_points: int = Field(ge=0, le=100)
    example: str | None = None


class ResumeReadinessSnapshot(BaseModel):
    meta: SnapshotMeta
    overall_score: int = Field(ge=0, le=100)
    target_role: str
    categories: dict[str, int]
    suggestions: list[ResumeSuggestionItem]
    reasons: list[ReasonItem]
    evidence_used: list[EvidenceRef]
    missing_evidence: list[MissingEvidence]


class MatchGapItem(BaseModel):
    key: str
    title: str
    severity: Literal["low", "medium", "high"]
    suggestion: str


class JobMatchSnapshot(BaseModel):
    meta: SnapshotMeta
    job_id: str
    match_score: int = Field(ge=0, le=100)
    breakdown: dict[str, int]
    gaps: list[MatchGapItem]
    reasons: list[ReasonItem]
    evidence_used: list[EvidenceRef]
    missing_evidence: list[MissingEvidence]


class ConfidenceDriverItem(BaseModel):
    key: str
    title: str
    effect: Literal["positive", "negative", "neutral"]
    note: str


class ConfidenceRiskItem(BaseModel):
    key: str
    title: str
    note: str
    uncertainty: Literal["known", "unknown"]


class ApplicationConfidenceSnapshot(BaseModel):
    meta: SnapshotMeta
    job_id: str
    confidence_score: int = Field(ge=0, le=100)
    decision: Literal["apply", "consider", "stretch", "skip"]
    decision_label: str
    drivers: list[ConfidenceDriverItem]
    risks: list[ConfidenceRiskItem]
    reasons: list[ReasonItem]
    evidence_used: list[EvidenceRef]
    missing_evidence: list[MissingEvidence]


class ApplicationConfidenceRequest(BaseModel):
    career_readiness: CareerReadinessSnapshot
    job_match: JobMatchSnapshot
    heuristics: dict[str, Any] | None = None
