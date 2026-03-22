"""Deterministic snapshot computation stubs for contract-first integration."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from app.intelligence.snapshots.hashing import compute_input_hash, compute_snapshot_id
from app.intelligence.snapshots.models import (
    ActionPlanItem,
    ApplicationConfidenceRequest,
    ApplicationConfidenceSnapshot,
    CareerReadinessRequest,
    CareerReadinessSnapshot,
    ConfidenceDriverItem,
    ConfidenceRiskItem,
    EvidenceRef,
    JobMatchRequest,
    JobMatchSnapshot,
    MatchGapItem,
    MissingEvidence,
    ReasonItem,
    ResumeReadinessRequest,
    ResumeReadinessSnapshot,
    ResumeSuggestionItem,
    SnapshotKind,
    SnapshotMeta,
    TopGapItem,
)
from app.intelligence.snapshots.versions import KNOWLEDGE_PACK_VERSION, RULE_VERSION


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _clamp_score(value: int) -> int:
    return max(0, min(100, value))


def _build_meta(kind: SnapshotKind, payload: dict[str, Any]) -> SnapshotMeta:
    input_hash = compute_input_hash(payload)
    snapshot_id = compute_snapshot_id(
        kind=kind,
        input_hash=input_hash,
        rule_version=RULE_VERSION,
        knowledge_pack_version=KNOWLEDGE_PACK_VERSION,
    )
    return SnapshotMeta(
        snapshot_id=snapshot_id,
        generated_at=_utc_now(),
        input_hash=input_hash,
        rule_version=RULE_VERSION,
        knowledge_pack_version=KNOWLEDGE_PACK_VERSION,
        kind=kind,
    )


def compute_career_readiness(req: CareerReadinessRequest) -> CareerReadinessSnapshot:
    payload = req.model_dump(mode="json", exclude_none=True)
    meta = _build_meta("career_readiness", payload)
    return CareerReadinessSnapshot(
        meta=meta,
        overall_score=74,
        label="Competitive with improvements",
        target_role=req.target_role,
        spokes={
            "qualification": 78,
            "specialized_experience": 72,
            "resume_evidence": 70,
            "keywords": 71,
            "leadership_scope": 76,
            "target_alignment": 77,
        },
        top_gaps=[
            TopGapItem(
                key="quantified-impact",
                title="Quantified impact coverage",
                impact_points=9,
                reason="Current profile evidence lacks repeated measurable outcomes.",
            ),
            TopGapItem(
                key="specialized-depth",
                title="Specialized experience depth",
                impact_points=7,
                reason="Target role expects deeper examples mapped to grade-level duties.",
            ),
            TopGapItem(
                key="keywords-targeted",
                title="Targeted keyword alignment",
                impact_points=6,
                reason="Resume and profile terms only partially mirror role terminology.",
            ),
        ],
        action_plan=[
            ActionPlanItem(
                key="add-metrics",
                title="Add quantified impact bullets",
                impact_points=8,
                effort="M",
                helper="Convert 3 recent accomplishments into metric-led STAR bullets.",
            ),
            ActionPlanItem(
                key="map-specialized-exp",
                title="Map specialized duties to role template",
                impact_points=7,
                effort="M",
                helper="Document explicit duty-to-result links for the target role.",
            ),
            ActionPlanItem(
                key="keyword-pass",
                title="Run role keyword pass",
                impact_points=5,
                effort="S",
                helper="Inject role-specific nouns and verbs without keyword stuffing.",
            ),
        ],
        reasons=[
            ReasonItem(
                code="baseline_v1",
                message="Rule v1 baseline starts at 74 for deterministic parity with current UI.",
                weight=0.6,
            ),
            ReasonItem(
                code="target_alignment_present",
                message="Target role was provided, enabling alignment scoring.",
                weight=0.2,
            ),
            ReasonItem(
                code="evidence_gap_detected",
                message="Missing quantified outcomes and specialized examples reduce score lift.",
                weight=-0.2,
            ),
        ],
        evidence_used=[
            EvidenceRef(
                key="target_role",
                label="Target role selection",
                source_type="system_rule",
                source_ref=f"target-role:{req.target_role}",
            ),
            EvidenceRef(
                key="profile_keys",
                label="Profile fields observed",
                source_type="profile_field",
                source_ref=f"profile:keys:{len(req.user_profile)}",
            ),
            EvidenceRef(
                key="resume_ref",
                label="Resume reference",
                source_type="resume_section",
                source_ref=req.resume_id if req.resume_id else "resume:unknown",
            ),
        ],
        missing_evidence=[
            MissingEvidence(
                key="quantified_outcomes",
                label="Quantified outcomes",
                why_it_matters="Supports best-qualified narratives and scoring confidence.",
            ),
            MissingEvidence(
                key="leadership_scope",
                label="Leadership scope examples",
                why_it_matters="Demonstrates scale, ownership, and strategic responsibility.",
            ),
            MissingEvidence(
                key="specialized_examples",
                label="Specialized duty examples",
                why_it_matters="Improves match against role-specific qualification language.",
            ),
        ],
    )


def compute_resume_readiness(req: ResumeReadinessRequest) -> ResumeReadinessSnapshot:
    payload = req.model_dump(mode="json", exclude_none=True)
    meta = _build_meta("resume_readiness", payload)
    resume_word_count = (
        len(req.resume_text.split()) if req.resume_text is not None else 0
    )
    score = _clamp_score(66 + min(12, resume_word_count // 40))
    return ResumeReadinessSnapshot(
        meta=meta,
        overall_score=score,
        target_role=req.target_role,
        categories={
            "clarity": _clamp_score(score + 2),
            "metrics": _clamp_score(score - 6),
            "keywords": _clamp_score(score - 2),
            "structure": _clamp_score(score + 1),
        },
        suggestions=[
            ResumeSuggestionItem(
                key="metrics-coverage",
                title="Increase metric density in bullets",
                impact_points=8,
                example="Reduced processing time by 23% across 4 regional workflows.",
            ),
            ResumeSuggestionItem(
                key="keyword-target-role",
                title="Mirror target-role keywords",
                impact_points=6,
                example="Use explicit duty language from the target announcement.",
            ),
            ResumeSuggestionItem(
                key="results-first-bullets",
                title="Rewrite bullets with result-first phrasing",
                impact_points=5,
            ),
        ],
        reasons=[
            ReasonItem(
                code="resume_length_signal",
                message="Word count contributes deterministic readiness signal.",
                weight=0.4,
            ),
            ReasonItem(
                code="metrics_gap",
                message="Metrics category remains below clarity and structure.",
                weight=-0.35,
            ),
            ReasonItem(
                code="target_role_present",
                message="Target role was provided for deterministic keyword framing.",
                weight=0.2,
            ),
        ],
        evidence_used=[
            EvidenceRef(
                key="resume_word_count",
                label="Resume word count",
                source_type="resume_section",
                source_ref=f"resume:words:{resume_word_count}",
            ),
            EvidenceRef(
                key="target_role",
                label="Target role",
                source_type="system_rule",
                source_ref=f"target-role:{req.target_role}",
            ),
            EvidenceRef(
                key="resume_source",
                label="Resume source",
                source_type="resume_section",
                source_ref=req.resume_id if req.resume_id else "resume:inline",
            ),
        ],
        missing_evidence=[
            MissingEvidence(
                key="quantified_bullets",
                label="Quantified bullets",
                why_it_matters="Quantified outcomes are weighted in readiness scoring.",
            ),
            MissingEvidence(
                key="scope_indicators",
                label="Scope indicators",
                why_it_matters="Team size, budget, or scale details improve competitiveness.",
            ),
            MissingEvidence(
                key="keyword_coverage",
                label="Role keyword coverage",
                why_it_matters="Improves machine and reviewer match quality.",
            ),
        ],
    )


def compute_job_match(req: JobMatchRequest) -> JobMatchSnapshot:
    payload = req.model_dump(mode="json", exclude_none=True)
    meta = _build_meta("job_match", payload)
    job_id = str(
        req.job.get("id")
        or req.job.get("job_id")
        or req.job.get("usajobs_id")
        or "job-unknown"
    )
    profile_terms_raw = req.user_profile.get("skills_keywords", [])
    profile_terms = {
        str(term).strip().lower()
        for term in profile_terms_raw
        if str(term).strip() != ""
    }
    job_text = " ".join(
        [
            str(req.job.get("title", "")),
            str(req.job.get("summary", "")),
            str(req.job.get("series", "")),
            str(req.job.get("grade", "")),
        ]
    ).lower()
    overlap_count = 0
    for term in profile_terms:
        if term in job_text:
            overlap_count += 1
    match_score = _clamp_score(62 + min(24, overlap_count * 4))
    return JobMatchSnapshot(
        meta=meta,
        job_id=job_id,
        match_score=match_score,
        breakdown={
            "qualification_match": _clamp_score(match_score + 3),
            "experience_match": _clamp_score(match_score - 2),
            "keywords_match": _clamp_score(58 + min(30, overlap_count * 5)),
            "target_alignment": _clamp_score(
                match_score + (2 if req.target_role is not None else 0)
            ),
        },
        gaps=[
            MatchGapItem(
                key="specialized-language",
                title="Specialized experience language",
                severity="medium",
                suggestion="Mirror vacancy specialized experience phrasing in resume evidence.",
            ),
            MatchGapItem(
                key="quantified-results",
                title="Quantified results",
                severity="high",
                suggestion="Add measurable outcomes tied directly to posted duties.",
            ),
            MatchGapItem(
                key="leadership-context",
                title="Leadership context",
                severity="low",
                suggestion="Clarify team scope and decision authority in examples.",
            ),
        ],
        reasons=[
            ReasonItem(
                code="keyword_overlap",
                message=f"Keyword overlap count: {overlap_count}.",
                weight=0.45,
            ),
            ReasonItem(
                code="job_identifier_present",
                message="Stable job identifier was resolved for snapshot lineage.",
                weight=0.15,
            ),
            ReasonItem(
                code="experience_depth_gap",
                message="Experience evidence depth still limits full qualification match.",
                weight=-0.25,
            ),
        ],
        evidence_used=[
            EvidenceRef(
                key="job_id",
                label="Job identifier",
                source_type="job_field",
                source_ref=f"job:id:{job_id}",
            ),
            EvidenceRef(
                key="profile_keywords",
                label="Profile keyword list",
                source_type="profile_field",
                source_ref=f"profile:skills:{len(profile_terms)}",
            ),
            EvidenceRef(
                key="job_text",
                label="Job title/summary fields",
                source_type="job_field",
                source_ref="job:title+summary",
            ),
        ],
        missing_evidence=[
            MissingEvidence(
                key="required_certifications",
                label="Required certifications",
                why_it_matters="Missing certification proof can block referred status.",
            ),
            MissingEvidence(
                key="grade_level_proof",
                label="Grade-level proof",
                why_it_matters="Grade alignment often requires explicit scope evidence.",
            ),
            MissingEvidence(
                key="specialized_years",
                label="Specialized years of experience",
                why_it_matters="Vacancy questions frequently check explicit experience duration.",
            ),
        ],
    )


def compute_application_confidence(
    req: ApplicationConfidenceRequest,
) -> ApplicationConfidenceSnapshot:
    payload = req.model_dump(mode="json", exclude_none=True)
    meta = _build_meta("application_confidence", payload)
    job_id = req.job_match.job_id
    confidence_score = _clamp_score(
        int(
            round(
                (req.career_readiness.overall_score * 0.45)
                + (req.job_match.match_score * 0.55)
            )
        )
    )
    decision: Literal["apply", "consider", "stretch", "skip"] = "skip"
    decision_label = "Skip for now"
    if confidence_score >= 75:
        decision = "apply"
        decision_label = "Apply now"
    elif confidence_score >= 65:
        decision = "consider"
        decision_label = "Consider with focused edits"
    elif confidence_score >= 55:
        decision = "stretch"
        decision_label = "Stretch opportunity"
    heuristic_keys = sorted((req.heuristics or {}).keys())
    return ApplicationConfidenceSnapshot(
        meta=meta,
        job_id=job_id,
        confidence_score=confidence_score,
        decision=decision,
        decision_label=decision_label,
        drivers=[
            ConfidenceDriverItem(
                key="career_readiness_score",
                title="Career readiness score",
                effect="positive",
                note=f"Career readiness contributed {req.career_readiness.overall_score}/100.",
            ),
            ConfidenceDriverItem(
                key="job_match_score",
                title="Job match score",
                effect="positive" if req.job_match.match_score >= 65 else "neutral",
                note=f"Job match contributed {req.job_match.match_score}/100.",
            ),
            ConfidenceDriverItem(
                key="heuristics",
                title="Heuristic adjustments",
                effect="neutral",
                note=f"Optional heuristic keys observed: {', '.join(heuristic_keys) if heuristic_keys else 'none'}.",
            ),
        ],
        risks=[
            ConfidenceRiskItem(
                key="missing_specialized_examples",
                title="Specialized examples may be insufficient",
                note="Narrative may not fully evidence grade-level duties.",
                uncertainty="known",
            ),
            ConfidenceRiskItem(
                key="questionnaire_unknowns",
                title="Questionnaire fit unknown",
                note="Knockout question outcomes are not part of this deterministic v1 model.",
                uncertainty="unknown",
            ),
            ConfidenceRiskItem(
                key="document_package_variance",
                title="Package completeness variance",
                note="Supporting documents were not validated by this endpoint.",
                uncertainty="known",
            ),
        ],
        reasons=[
            ReasonItem(
                code="weighted_blend",
                message="Confidence blends career readiness and job match deterministically.",
                weight=1.0,
            ),
            ReasonItem(
                code="decision_threshold",
                message=f"Decision threshold mapped score {confidence_score} to '{decision}'.",
                weight=0.6,
            ),
            ReasonItem(
                code="unknown_external_factors",
                message="External questionnaire and human review factors remain out of scope.",
                weight=-0.2,
            ),
        ],
        evidence_used=[
            EvidenceRef(
                key="career_readiness_snapshot",
                label="Career readiness snapshot reference",
                source_type="system_rule",
                source_ref=req.career_readiness.meta.snapshot_id,
            ),
            EvidenceRef(
                key="job_match_snapshot",
                label="Job match snapshot reference",
                source_type="system_rule",
                source_ref=req.job_match.meta.snapshot_id,
            ),
            EvidenceRef(
                key="heuristics",
                label="Heuristics payload keys",
                source_type="system_rule",
                source_ref=f"heuristics:{len(heuristic_keys)}",
            ),
        ],
        missing_evidence=[
            MissingEvidence(
                key="questionnaire_answers",
                label="Questionnaire answers",
                why_it_matters="Questionnaire scoring can change practical confidence materially.",
            ),
            MissingEvidence(
                key="supporting_documents",
                label="Supporting documents",
                why_it_matters="Missing transcripts or certifications can invalidate applications.",
            ),
            MissingEvidence(
                key="hiring_timeline",
                label="Hiring timeline signals",
                why_it_matters="Time-sensitive postings can change strategy and confidence.",
            ),
        ],
    )
