# PathOS Day-by-Day Development Documentation

This folder contains the canonical day-by-day development documentation for the PathOS project.

## Purpose

These files serve as the official execution log and reference for the PathOS frontend development roadmap. Each day document captures objectives, key tasks, validation criteria, and notes from that phase of development.

## How to Use

- Read documents in sequence (Day 1 through Day 11) for full context
- Reference individual days when working on related features
- Use Validation Commands sections to verify your environment matches expected state
- Check Notes and Decisions for architectural rationale

## Day Index

| Day | Title | File |
|-----|-------|------|
| 1 | Server Bring-Up and Base Hardening | [day-01-server-bringup-base-hardening.md](./day-01-server-bringup-base-hardening.md) |
| 2 | Network, SSH Keys, and SSH Hardening | [day-02-network-ssh-hardening.md](./day-02-network-ssh-hardening.md) |
| 3 | Container Runtime and Dev Tooling Initialization | [day-03-container-runtime-dev-tooling.md](./day-03-container-runtime-dev-tooling.md) |
| 4 | Frontend Scaffolding and Routing Baseline | [day-04-frontend-scaffolding-routing-baseline.md](./day-04-frontend-scaffolding-routing-baseline.md) |
| 5 | Mock API Layer and Dev Tooling Completion | [day-05-mock-api-layer-store-debug-panel.md](./day-05-mock-api-layer-store-debug-panel.md) |
| 6 | Global Privacy and Per-Card Visibility | [day-06-global-privacy-per-card-visibility-delete-local-data.md](./day-06-global-privacy-per-card-visibility-delete-local-data.md) |
| 7 | Resume Builder Flow v1 | [day-07-resume-builder-flow-v1.md](./day-07-resume-builder-flow-v1.md) |
| 8 | Job Search Workspace Polish v1 | [day-08-job-search-workspace-polish-v1.md](./day-08-job-search-workspace-polish-v1.md) |
| 9 | API Contracts and Wiring (Frontend Only) | [day-09-api-contracts-wiring-frontend-only.md](./day-09-api-contracts-wiring-frontend-only.md) |
| 10 | Job Seeker Intelligence Layer v1 | [day-10-job-seeker-intelligence-layer-v1.md](./day-10-job-seeker-intelligence-layer-v1.md) |
| 11 | Job Search Filters and Saved Searches v1 | [day-11-job-search-filters-saved-searches-v1.md](./day-11-job-search-filters-saved-searches-v1.md) |

## PathOS Standards Referenced

Throughout these documents, you will see references to key PathOS conventions:

- **Local-first data storage**: User data persists in browser storage before any backend sync
- **Global privacy toggle**: Master switch for visibility across all dashboard cards
- **Per-card visibility overrides**: Fine-grained control over individual card visibility
- **Delete All Local Data**: Located in Settings → Privacy & Security
- **pnpm**: Always use pnpm (not npm) for package management
- **develop vs main**: Environment mapping for staging and production deployments
- **Backend separation**: Deterministic logic lives in the separate FastAPI repo

## Notes

These documents are canonical references. If implementation details differ from what is documented here, the actual codebase is the source of truth for current behavior, while these documents capture the intended design at each phase.

