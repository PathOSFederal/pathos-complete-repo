#!/usr/bin/env python3
"""Run deterministic retention cleanup and print summary."""

from __future__ import annotations

import json

from app.services.retention_service import RetentionService


if __name__ == "__main__":
    summary = RetentionService.cleanup()
    print(
        json.dumps(
            {
                "digests_deleted": summary.digests_deleted,
                "runs_deleted": summary.runs_deleted,
                "audits_deleted": summary.audits_deleted,
                "upstream_raw_deleted": summary.upstream_raw_deleted,
                "thread_summaries_cleared": summary.thread_summaries_cleared,
            },
            sort_keys=True,
        )
    )
