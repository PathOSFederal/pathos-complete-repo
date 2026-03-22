# Day 9 – API Contracts and Wiring (Frontend Only)

## Objective

Define API contracts and establish wiring points for backend integration without implementing deterministic backend logic. Backend logic belongs in the separate FastAPI repository.

## Key Tasks

- Define TypeScript interfaces for API request/response shapes
- Document API endpoint contracts (routes, methods, payloads)
- Create API client functions in `lib/api/*`
- Implement request/response type validation (Zod or similar)
- Wire frontend components to use API abstraction layer
- Ensure mock mode continues to work for development
- Keep all deterministic logic out of frontend

## Use of GPT Assistants

Representative tasks included:

- Generating TypeScript interface definitions from API specs
- Creating Zod schema templates for validation
- Reviewing API contract best practices

## Completion Criteria

- [ ] API contracts defined as TypeScript interfaces
- [ ] API endpoint documentation complete
- [ ] API client functions created for all endpoints
- [ ] Request/response validation implemented
- [ ] Components wired through abstraction layer
- [ ] Mock mode remains functional for development
- [ ] No deterministic backend logic in frontend codebase

## Validation Commands

```bash
# Run validation suite
pnpm typecheck
pnpm lint
pnpm build
pnpm test

# Verify mock mode still works
pnpm dev
# Test app functionality with mock data

# Check for any backend logic (should find none)
# Search for patterns that might indicate backend logic creep
```

## Notes and Decisions

- Frontend defines contracts; backend implements them in FastAPI repo
- API abstraction allows swapping mock for real endpoints via environment config
- Deterministic logic (scoring, calculations, eligibility rules) lives in backend
- Frontend displays results but does not compute them
- Zod schemas provide runtime type safety for API responses
- Consider API versioning strategy for future compatibility
- Environment variables control mock vs real API mode

