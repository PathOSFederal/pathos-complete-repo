from __future__ import annotations

from app.engine.reason_library import RULESET_VERSION, render_reason_detail
from app.engine.scoring import (
    confidence_for_score,
    experience_score,
    infer_required_keywords,
    location_score,
    recommendation_for_score,
    role_alignment_score,
    skill_overlap,
    skill_overlap_score,
    work_auth_score,
)
from app.models.advisor import AdvisorInput, AdvisorMeta, AdvisorOutput, NextActionItem, ReasonItem, RiskItem


ENGINE_VERSION = "deterministic-engine-v1"


def evaluate_advisor_input(advisor_input: AdvisorInput) -> AdvisorOutput:
    required_keywords = infer_required_keywords(advisor_input.job.title)
    overlap = skill_overlap(advisor_input.profile.skills, required_keywords)
    matched_skills = sorted({s.lower() for s in advisor_input.profile.skills}.intersection(required_keywords))
    role_score = role_alignment_score(advisor_input.profile.target_roles, advisor_input.job.title)
    skills_score = skill_overlap_score(overlap)

    min_grade = advisor_input.job.grade_range.min_grade if advisor_input.job.grade_range else None
    max_grade = advisor_input.job.grade_range.max_grade if advisor_input.job.grade_range else None
    exp_score = experience_score(advisor_input.profile.years_experience, min_grade, max_grade)
    loc_score = location_score(
        preferred_locations=advisor_input.profile.preferred_locations,
        is_remote=advisor_input.job.location.remote,
        city=advisor_input.job.location.city,
        region=advisor_input.job.location.region,
    )
    auth_score = work_auth_score(advisor_input.profile.authorized_to_work)
    total_score = role_score + skills_score + exp_score + loc_score + auth_score

    reasons = _build_reasons(
        advisor_input=advisor_input,
        role_score=role_score,
        overlap=overlap,
        matched_skills=matched_skills,
        min_grade=min_grade,
        max_grade=max_grade,
        location_score_value=loc_score,
    )
    risks, next_actions = _build_risks_and_actions(advisor_input=advisor_input, overlap=overlap, location_score_value=loc_score)

    return AdvisorOutput(
        recommendation=recommendation_for_score(total_score),
        confidence_band=confidence_for_score(total_score),
        reasons=sorted(reasons, key=lambda item: item.code or ""),
        risks=sorted(risks, key=lambda item: item.code or ""),
        next_actions=sorted(next_actions, key=lambda item: item.code or ""),
        evidence=[],
        meta=AdvisorMeta(
            policy_version="v1",
            engine_version=ENGINE_VERSION,
            ruleset_version=RULESET_VERSION,
        ),
    )


def _build_reasons(
    advisor_input: AdvisorInput,
    role_score: int,
    overlap: float,
    matched_skills: list[str],
    min_grade: int | None,
    max_grade: int | None,
    location_score_value: int,
) -> list[ReasonItem]:
    reasons: list[ReasonItem] = []

    role_code = "ROLE_MATCH_STRONG" if role_score > 0 else "ROLE_MATCH_WEAK"
    reasons.append(
        ReasonItem(
            code=role_code,
            text=render_reason_detail(role_code, job_title=advisor_input.job.title),
        )
    )

    skill_code = "SKILL_OVERLAP_HIGH" if overlap >= 0.4 else "SKILL_OVERLAP_LOW"
    reasons.append(
        ReasonItem(
            code=skill_code,
            text=render_reason_detail(
                skill_code,
                matched_skills=", ".join(matched_skills) if matched_skills else "none",
            ),
        )
    )

    years_experience = advisor_input.profile.years_experience
    if min_grade is None or max_grade is None:
        exp_code = "EXPERIENCE_RANGE_UNKNOWN"
    elif min_grade <= years_experience <= max_grade:
        exp_code = "EXPERIENCE_IN_RANGE"
    elif years_experience < min_grade:
        exp_code = "EXPERIENCE_BELOW_RANGE"
    else:
        exp_code = "EXPERIENCE_ABOVE_RANGE"
    reasons.append(
        ReasonItem(
            code=exp_code,
            text=render_reason_detail(exp_code, years_experience=years_experience),
        )
    )

    location_code = "LOCATION_MATCH" if location_score_value > 0 else "LOCATION_MISMATCH"
    reasons.append(ReasonItem(code=location_code, text=render_reason_detail(location_code)))

    auth_code = "WORK_AUTHORIZED" if advisor_input.profile.authorized_to_work else "WORK_AUTH_MISSING"
    reasons.append(ReasonItem(code=auth_code, text=render_reason_detail(auth_code)))

    return reasons


def _build_risks_and_actions(
    advisor_input: AdvisorInput, overlap: float, location_score_value: int
) -> tuple[list[RiskItem], list[NextActionItem]]:
    risks: list[RiskItem] = []
    actions: list[NextActionItem] = []

    if not advisor_input.profile.authorized_to_work:
        risks.append(
            RiskItem(
                code="RISK_AUTH",
                text="Work authorization is not confirmed.",
                mitigation="Confirm eligibility before submitting an application.",
            )
        )
        actions.append(NextActionItem(code="ACT_CONFIRM_AUTH", action="Confirm work authorization status.", priority=1))

    if overlap < 0.4:
        risks.append(
            RiskItem(
                code="RISK_SKILL_GAP",
                text="Core skill overlap is below the target threshold.",
                mitigation="Highlight adjacent experience and close missing skills.",
            )
        )
        actions.append(
            NextActionItem(code="ACT_TAILOR_SKILLS", action="Tailor resume to emphasize matching stack skills.", priority=2)
        )

    if location_score_value == 0:
        risks.append(
            RiskItem(
                code="RISK_LOCATION",
                text="Preferred location and job location are misaligned.",
                mitigation="Confirm relocation or remote flexibility.",
            )
        )
        actions.append(NextActionItem(code="ACT_VERIFY_LOCATION", action="Verify location flexibility.", priority=2))

    if not actions:
        actions.append(NextActionItem(code="ACT_APPLY", action="Submit application with role-tailored resume.", priority=1))
        actions.append(
            NextActionItem(code="ACT_PREP_INTERVIEW", action="Prepare interview examples aligned with job scope.", priority=2)
        )

    return risks, actions
