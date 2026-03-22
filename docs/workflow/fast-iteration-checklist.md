# Fast Iteration Checklist

Use this checklist during the builder phase.

## Goal

Reach a functionally correct implementation quickly, with one primary builder and one bounded task.

## Checklist

- Start from one task file with a clear objective and explicit scope.
- Keep iteration fast: implement, inspect, refine.
- Keep changes focused, reviewable, and directly related to the task.
- Capture blockers, assumptions, and open validation needs as they appear.
- Review and refine until the feature behaves correctly for the task.
- Declare an explicit iteration freeze once the feature is correct.
- Hand off to Codex hardening only after freeze.

## Exit Criteria

Iteration is ready to freeze when:
- the requested behavior is implemented
- any explicit parity or structural requirements in the task are met
- obvious defects from the build loop are addressed
- known risks are documented
- no additional feature work is still in motion
