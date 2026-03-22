# Hardening Checklist

Use this checklist after iteration freeze.

## Goal

Verify merge readiness without reopening feature design.

## Checklist

- Confirm iteration freeze and task scope.
- Run relevant typecheck commands.
- Run the required build step if the repo or change type expects it.
- Add or update automated tests where the change type requires them.
- Run targeted runtime or manual validation for affected flows.
- Use Playwright when route, shell, navigation, hydration, or runtime confidence is needed.
- Record docs artifacts: change brief, merge notes, review summary, PR summary.
- List remaining validation gaps and residual risks.
- Get final approval before any commit or push step.

## Exit Criteria

Hardening is complete when:
- required validation has been run or explicitly waived
- required tests are present or the reason for omission is documented
- merge notes and change brief are current
- the final review clearly states merge-ready or blocked
