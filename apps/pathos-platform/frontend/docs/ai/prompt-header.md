# Frontend Prompt Stack Pointer

This path is retained for compatibility with older prompts and local repo references.

Use the execution stack below:

1. explicit user request
2. active task file
3. repo-local app guidance
4. root builder guidance
5. workflow and process docs

Hard repo constraints remain mandatory.
Soft guidance must not override explicit task intent.

Canonical builder stack:
- `C:\dev\PathOS\AGENTS.md`
- `C:\dev\PathOS\docs\agents\builder-agent-rules.md`
- `C:\dev\PathOS\docs\workflow\fast-iteration-checklist.md`
- `C:\dev\PathOS\tasks\<task>.md`
- applicable repo-local guidance such as `apps/pathos-platform/frontend/AGENTS.md`

Canonical hardening stack:
- `C:\dev\PathOS\AGENTS.md`
- `C:\dev\PathOS\docs\agents\codex-hardening-rules.md`
- `C:\dev\PathOS\docs\workflow\hardening-checklist.md`
- `C:\dev\PathOS\docs\testing\testing-standards.md`
- `C:\dev\PathOS\tasks\<task>.md`
- applicable repo-local guidance such as `apps/pathos-platform/frontend/AGENTS.md`

Do not copy stale prompt blocks from this location into new prompts.
