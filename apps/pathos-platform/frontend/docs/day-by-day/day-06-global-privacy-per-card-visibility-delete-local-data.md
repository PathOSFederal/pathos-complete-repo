# Day 6 – Global Privacy and Per-Card Visibility

## Objective

Implement the global privacy toggle, per-card visibility overrides across dashboard modules, and wire the Delete All Local Data functionality in Settings.

## Key Tasks

- Implement global hide/show privacy toggle
- Create per-card visibility override system
- Apply visibility controls to all dashboard cards
- Apply visibility controls to key modules
- Wire Delete All Local Data functionality
- Place Delete All Local Data in Settings → Privacy & Security
- Ensure visibility state persists correctly in local storage

## Use of GPT Assistants

Representative tasks included:

- Designing visibility state architecture
- Generating visibility toggle component patterns
- Reviewing local storage persistence strategies

## Completion Criteria

- [ ] Global privacy toggle implemented and functional
- [ ] Per-card visibility overrides work independently of global toggle
- [ ] All dashboard cards respect visibility settings
- [ ] Key modules respect visibility settings
- [ ] Delete All Local Data clears all persisted state
- [ ] Delete All Local Data is accessible in Settings → Privacy & Security
- [ ] Visibility preferences persist across browser sessions

## Validation Commands

```bash
# Run full validation
pnpm typecheck
pnpm lint
pnpm build

# Manual testing steps:
# 1. Toggle global privacy - verify all cards hide/show
# 2. Override individual card visibility - verify it overrides global
# 3. Navigate to Settings → Privacy & Security
# 4. Click Delete All Local Data - verify state clears
# 5. Refresh - verify app returns to default state
```

## Notes and Decisions

- Global toggle affects all cards; per-card overrides take precedence when set
- Visibility architecture: global state + per-card exceptions stored in Zustand
- Delete All Local Data must clear: Zustand persisted state, localStorage, sessionStorage
- Privacy controls are a core PathOS feature for user trust
- The toggle should be easily accessible (header or prominent settings location)
- Consider confirmation dialog for Delete All Local Data to prevent accidents

