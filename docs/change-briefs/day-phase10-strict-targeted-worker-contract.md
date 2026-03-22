# Day Phase 10 - Strict Targeted Worker Contract

We tightened the implementation-worker rules for targeted UI standardization runs.

These runs can now carry:
- a flag that forces targeted modification
- an explicit list of allowed target files
- a rule that says “no target-surface change means failure”

The worker prompt now explicitly says that already-dirty target files are still valid places to make the required implementation edits.

The worker stage also now enforces a stronger success rule: for strict targeted runs, at least one allowed target file must actually change. If not, the run fails with a specific no-target-surface-change reason instead of looking like a vague no-op.
