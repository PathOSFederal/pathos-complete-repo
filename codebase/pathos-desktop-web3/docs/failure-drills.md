# Failure Drills (Bug Training)

> **Rule**: Any PR that fixes a bug MUST add an entry to this file.
> This creates institutional memory and prevents the same class of bugs from recurring.

---

## Template

When adding a new entry, copy this template and fill in all fields:

```markdown
### [DATE] [SHORT DESCRIPTION]

**Trigger Path:**
UI → store → persistence → UI
(Describe the exact path where the bug manifested)

**Store(s) Involved:**
- [store name]

**Storage Key(s) Involved:**
- [localStorage key]

**Repro Steps:**
1. [Step 1]
2. [Step 2]
3. [Expected vs actual behavior]

**How to Confirm Fixed:**
1. [Verification step 1]
2. [Verification step 2]

**Regression Test Added:** Yes / No
(If No, explain why)

**Root Cause:**
[Brief explanation of why the bug happened]

**Prevention:**
[What pattern or check would have caught this earlier?]
```

---

## Entries

(Add new entries below this line, newest at top)

---

*Last updated: December 2025 (Day 20)*

