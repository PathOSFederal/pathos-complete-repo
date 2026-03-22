from __future__ import annotations

import logging

from app.services.export_service import ExportService


def test_export_thread_includes_deterministic_hash_for_known_payload(
    caplog, monkeypatch
) -> None:
    monkeypatch.setattr(
        "app.services.export_service.ThreadRepo.get_thread_record",
        lambda thread_id: {
            "thread_id": thread_id,
            "updated_at": "2026-02-23T00:00:00+00:00",
            "title": "Trust",
            "consent_store": True,
        },
    )
    monkeypatch.setattr(
        "app.services.export_service.ThreadRepo.list_thread_messages",
        lambda thread_id: [
            {
                "message_id": "m1",
                "thread_id": thread_id,
                "created_at": "2026-02-23T00:00:01+00:00",
                "role": "user",
                "content": "hello",
                "trace_id": "trace-1",
            }
        ],
    )
    monkeypatch.setattr(
        "app.services.export_service.AuditRepo.get_audits_by_trace_ids",
        lambda trace_ids: [
            {
                "trace_id": trace_ids[0],
                "created_at": "2026-02-23T00:00:01+00:00",
                "input_hash": "input-abc",
                "ruleset_version": "v1",
                "engine_version": "engine-v1",
                "evaluation_json": "{}",
                "narration_json": None,
                "narration_mode": None,
                "prompt_bundle_version": None,
            }
        ],
    )
    caplog.set_level(logging.INFO, logger="pathos.export")

    payload = ExportService.export_thread("thread-1")

    assert (
        payload["export_hash"]
        == "9f99cae3ceef535d99e6c17564ee7650786fc5f08786e885a287e8fa33671751"
    )
    assert payload["hash_alg"] == "sha256"
    assert payload["export_bytes"] == 518

    event_ids = [
        json_extra.get("event_id")
        for json_extra in (
            getattr(record, "json_extra", None) for record in caplog.records
        )
        if isinstance(json_extra, dict)
    ]
    assert "export_generated" in event_ids


def test_export_hash_changes_when_payload_changes(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.services.export_service.ThreadRepo.get_thread_record",
        lambda thread_id: {
            "thread_id": thread_id,
            "updated_at": "2026-02-23T00:00:00+00:00",
            "title": "Trust",
            "consent_store": True,
        },
    )

    monkeypatch.setattr(
        "app.services.export_service.ThreadRepo.list_thread_messages",
        lambda thread_id: [
            {
                "message_id": "m1",
                "thread_id": thread_id,
                "created_at": "2026-02-23T00:00:01+00:00",
                "role": "user",
                "content": "hello",
                "trace_id": "trace-1",
            }
        ],
    )
    monkeypatch.setattr(
        "app.services.export_service.AuditRepo.get_audits_by_trace_ids",
        lambda *, trace_ids: [],
    )

    first = ExportService.export_thread("thread-1")

    monkeypatch.setattr(
        "app.services.export_service.ThreadRepo.list_thread_messages",
        lambda thread_id: [
            {
                "message_id": "m1",
                "thread_id": thread_id,
                "created_at": "2026-02-23T00:00:01+00:00",
                "role": "user",
                "content": "changed",
                "trace_id": "trace-1",
            }
        ],
    )
    second = ExportService.export_thread("thread-1")

    assert first["export_hash"] != second["export_hash"]
