# Codex Resilient Usage

## Run the resilient script directly

```powershell
.\run-codex-resilient.ps1 `
  -RepoRoot "C:\dev\MyRepo" `
  -Prompt "Implement the feature in task.md"
```

## Run the PowerShell convenience launcher

```powershell
.\crun.ps1 `
  -RepoRoot "C:\dev\MyRepo" `
  -Prompt "Implement the feature in task.md"
```

## Run the CMD convenience launcher

```cmd
crun -RepoRoot "C:\dev\MyRepo" -Prompt "Fix the failing tests"
```

## Notes

- The helper is directory-agnostic because it always targets the workspace explicitly with `codex exec --cd <RepoRoot>`.
- On retries, resume by session or thread ID is preferred when available; `resume --last --all` is only the fallback.
- Attempt logs are written as JSONL files, and `codex-status.json` is updated after each run attempt.
