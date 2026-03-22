from enum import Enum


class Recommendation(str, Enum):
    APPLY = "apply"
    SHORTLIST = "shortlist"
    SKIP = "skip"
    NEEDS_INFO = "needs_info"


class ConfidenceBand(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"