# Day 4 – Frontend Scaffolding and Routing Baseline

## Objective

Establish the Next.js application foundation with App Router, core route structure, shell layout, and initial UI consistency. This day transitions from infrastructure to application development.

## Key Tasks

- Initialize Next.js project with App Router
- Configure TypeScript, ESLint, and Prettier
- Establish core route structure (dashboard, settings, etc.)
- Create shell layout components (header, sidebar, main content area)
- Implement mocked data for initial UI development
- Ensure initial UI consistency across routes
- Set up pnpm as the package manager

## Use of GPT Assistants

Representative tasks included:

- Generating Next.js App Router boilerplate
- Creating consistent layout component templates
- Reviewing TypeScript configuration for strictness

## Completion Criteria

- [ ] Next.js project initialized with App Router
- [ ] TypeScript configured with strict mode
- [ ] ESLint and Prettier configured and passing
- [ ] Core routes defined and navigable
- [ ] Shell layout renders consistently across routes
- [ ] Mocked data supports initial UI rendering
- [ ] pnpm lock file committed (no package-lock.json or yarn.lock)

## Validation Commands

```bash
# Install dependencies
pnpm install

# Run type checking
pnpm typecheck

# Run linting
pnpm lint

# Run development server
pnpm dev

# Build for production (verify no build errors)
pnpm build
```

## Notes and Decisions

- PathOS uses pnpm exclusively; do not use npm or yarn
- App Router is the routing paradigm (not Pages Router)
- Mocked data lives in dedicated files, not inline in components
- Layout components should support the global privacy toggle (Day 6)
- UI consistency means shared typography, spacing, and color tokens
- The develop branch maps to staging; main maps to production

