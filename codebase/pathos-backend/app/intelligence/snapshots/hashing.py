"""Stable hashing helpers for deterministic snapshot inputs."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def stable_json_dumps(obj: Any) -> str:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def compute_input_hash(obj: Any) -> str:
    encoded = stable_json_dumps(obj).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def compute_snapshot_id(
    kind: str,
    input_hash: str,
    rule_version: str,
    knowledge_pack_version: str,
) -> str:
    return f"{kind}:{input_hash[:12]}:{rule_version}:{knowledge_pack_version}"
