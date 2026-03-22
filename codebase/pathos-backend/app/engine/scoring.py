from __future__ import annotations

import re

from app.models.common import ConfidenceBand, Recommendation

ROLE_KEYWORDS: dict[str, set[str]] = {
    "backend": {"python", "fastapi", "api", "sql", "backend"},
    "data": {"python", "sql", "analytics", "statistics", "modeling"},
    "frontend": {"javascript", "typescript", "react", "css", "frontend"},
}


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def infer_required_keywords(job_title: str) -> set[str]:
    normalized_title = normalize(job_title)
    keywords: set[str] = set()
    for marker, marker_keywords in ROLE_KEYWORDS.items():
        if marker in normalized_title:
            keywords.update(marker_keywords)
    if not keywords:
        keywords.update({token for token in re.findall(r"[a-z0-9]+", normalized_title) if len(token) > 2})
    return keywords


def skill_overlap(profile_skills: list[str], required_keywords: set[str]) -> float:
    if not required_keywords:
        return 0.0
    normalized_skills = {normalize(skill) for skill in profile_skills}
    matched = normalized_skills.intersection(required_keywords)
    return len(matched) / len(required_keywords)


def role_alignment_score(target_roles: list[str], job_title: str) -> int:
    normalized_title = normalize(job_title)
    for role in target_roles:
        if normalize(role) in normalized_title or normalized_title in normalize(role):
            return 20
    return 0


def skill_overlap_score(overlap: float) -> int:
    return int(round(overlap * 35))


def experience_score(years_experience: int, min_grade: int | None, max_grade: int | None) -> int:
    if min_grade is None or max_grade is None:
        return 10
    if min_grade <= years_experience <= max_grade:
        return 25
    if years_experience < min_grade:
        return 8
    return 15


def location_score(preferred_locations: list[str], is_remote: bool, city: str | None, region: str | None) -> int:
    if is_remote:
        return 15
    preferred = {normalize(location) for location in preferred_locations}
    candidates = {
        normalize(" ".join([part for part in [city, region] if part])),
        normalize(", ".join([part for part in [city, region] if part])),
        normalize(city or ""),
        normalize(region or ""),
    }
    return 10 if preferred.intersection(candidates) else 0


def work_auth_score(authorized_to_work: bool) -> int:
    return 10 if authorized_to_work else -60


def recommendation_for_score(score: int) -> Recommendation:
    if score >= 70:
        return Recommendation.APPLY
    if score >= 50:
        return Recommendation.SHORTLIST
    if score >= 35:
        return Recommendation.NEEDS_INFO
    return Recommendation.SKIP


def confidence_for_score(score: int) -> ConfidenceBand:
    if score >= 75:
        return ConfidenceBand.HIGH
    if score >= 45:
        return ConfidenceBand.MEDIUM
    return ConfidenceBand.LOW
