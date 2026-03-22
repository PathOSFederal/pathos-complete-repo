# n8n First Run Packet Example

This file exists as a minimal reference for the `n8n-lab` experiment.
It shows the packet shape an n8n Set node can emit and the exact PowerShell command
an Execute Command node can run to create a local run folder.

## Example Set Node Packet

```json
{
  "project": "pathos-frontend",
  "workspaceRoot": "C:\\dev\\PathOS",
  "platformRoot": "C:\\dev\\PathOS\\apps\\pathos-platform",
  "repoPath": "C:\\dev\\PathOS\\apps\\pathos-platform\\frontend",
  "n8nLabRoot": "C:\\dev\\PathOS\\n8n-lab",
  "runsRoot": "C:\\dev\\PathOS\\n8n-lab\\runs",
  "scriptsRoot": "C:\\dev\\PathOS\\n8n-lab\\scripts",
  "branchName": "feature/day-75-n8n-dev-pipeline-v1",
  "goal": "Test n8n automated dev pipeline",
  "dayNumber": 75
}
```

## Example Execute Command Node Command

```powershell
powershell.exe -ExecutionPolicy Bypass -File "C:\dev\PathOS\n8n-lab\scripts\prepare-run.ps1" -RunId "{{$json.runId}}" -RunsRoot "{{$json.runsRoot}}" -RepoPath "{{$json.repoPath}}" -BranchName "{{$json.branchName}}" -Goal "{{$json.goal}}" -DayNumber "{{$json.dayNumber}}"
```
