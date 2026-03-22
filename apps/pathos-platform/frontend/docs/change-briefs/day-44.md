# Day 44 — Guided USAJOBS Click-to-Explain Prototype

## What changed
- Added a new Guided USAJOBS workspace that embeds USAJOBS inside PathOS and keeps PathAdvisor visible on the right.
- Implemented a click-to-explain flow with an explicit state machine and local-only screenshot capture.
- Added structured, federal-specific response templates and goal inputs to tailor guidance.
- Added trust boundary microcopy and privacy/OPSEC details.

## Why it changed
Users need to stay in the real USAJOBS workflow while getting calm, consequence-based explanations. The new workspace keeps USAJOBS as the system of record and provides guidance without scraping or DOM access.

## Notes for reviewers
- Embed fallback messaging appears if USAJOBS blocks iframe embedding.
- Screenshot data is ephemeral and never stored in localStorage.
- Goal context is stored locally to tailor guidance only.
