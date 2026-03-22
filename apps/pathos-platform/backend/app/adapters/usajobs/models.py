"""app.adapters.usajobs.models

WHY THIS FILE EXISTS:
This module captures only the subset of USAJOBS response schema needed for deterministic mapping.
Validation here protects the service layer from drift in upstream payload shape.

LAYER FIT:
- Adapter schema layer (external contract parsing).

WHAT THIS FILE MUST NOT DO:
- Must not perform HTTP calls.
- Must not import FastAPI or persistence dependencies.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class USAJobsRemuneration(BaseModel):
    """Partial salary payload from USAJOBS."""

    MinimumRange: str | None = None
    MaximumRange: str | None = None


class USAJobsLocation(BaseModel):
    """Location node from USAJOBS."""

    LocationName: str | None = None


class USAJobsDetails(BaseModel):
    """Details payload used for deterministic field mapping."""

    LowGrade: str | None = None
    HighGrade: str | None = None
    PositionURI: str | None = None
    ApplyURI: list[str] | None = None
    RemoteIndicator: bool | None = None
    TeleworkEligible: bool | None = None
    PublicationStartDate: str | None = None
    ApplicationCloseDate: str | None = None


class USAJobsUserArea(BaseModel):
    """UserArea container from USAJOBS."""

    Details: USAJobsDetails | None = None


class USAJobsDescriptor(BaseModel):
    """Descriptor for one matched position."""

    PositionID: str | None = None
    PositionTitle: str | None = None
    OrganizationName: str | None = None
    PositionLocationDisplay: str | None = None
    PositionLocation: list[USAJobsLocation] | None = None
    PositionRemuneration: list[USAJobsRemuneration] | None = None
    UserArea: USAJobsUserArea | None = None


class USAJobsSearchItem(BaseModel):
    """One search result item from USAJOBS."""

    MatchedObjectId: str | None = None
    MatchedObjectDescriptor: USAJobsDescriptor


class USAJobsSearchResultBlock(BaseModel):
    """Container for result count and result list."""

    SearchResultItems: list[USAJobsSearchItem] = Field(default_factory=list)
    SearchResultCountAll: int | str | None = 0


class USAJobsEnvelope(BaseModel):
    """Top-level response model for USAJOBS search."""

    SearchResult: USAJobsSearchResultBlock
