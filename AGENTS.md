AGENTS.md – KB3 Agent Guide

Build/Lint/Test
- Build: `npm run build` (root); backend/frontend: `cd packages/<app> && npm run build`
- Dev: core `npm run dev`; backend `cd packages/backend && npm run dev`; frontend `cd packages/frontend && npm run dev`
- Lint (core): `npm run lint` | fix: `npm run lint:fix`; frontend: `cd packages/frontend && npm run lint`
- Typecheck: backend/frontend `npm run typecheck`
- Tests (all): `npm test` | coverage: `npm run test:coverage`
- Test suites: `npm run test:unit|integration|solid|e2e` (frontend also `test:smoke`, `test:ci`)
- Single test file: `npm test -- tests/path/My.test.ts`
- Single test name: `npm test -- -t "test name"` | watch: `npm run test:watch`

Code Style
- Imports: prefer relative within `src/*`; don’t cross layers; no aliasing unless in `tsconfig`. Root has no path aliases.
- Formatting: ESLint only (no Prettier). Run lint before commit; keep diffs small.
- Types: strict TS (`noImplicitAny`, `strictNullChecks`, etc.). Avoid `any`; return explicit types.
- Naming: Interfaces `I*`; abstracts `Base*`; registries `*Registry`; private helpers `_name`.
- Errors: use `ErrorHandler.categorizeError()`; include context; don’t throw raw from low-level; propagate via abstractions.
- SOLID: SRP per folder; extend via composition/registries; never modify existing classes to add features (OCP); DI via constructors (DIP).
- Tests: cover public APIs with unit + integration + SOLID; don’t write to `test-data/` at runtime—use `dev-data/`.
- Tools: Python setup `npx tsx scripts/setup-python.ts`; verify `npx tsx verify-scrapers.ts`.
- Cursor/Copilot: no `.cursor/rules` or `.github/copilot-instructions.md` found.
