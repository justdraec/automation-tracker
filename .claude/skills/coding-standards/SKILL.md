# Coding Standards Skill

TypeScript + React coding standards for the Automation Opportunity Tracker.

## TypeScript
- Strict mode, no `any` (exception: Web Speech API)
- `interface` for shapes, `type` for unions
- `import type` for type-only imports
- `@/` alias for all imports
- Explicit return types on async functions

## React
- Functional components only
- `useState` with functional updates for derived state
- `useMemo` for expensive computations (filtering, sorting)
- `useCallback` for handler props passed to child components
- `useEffect` cleanup for timers, listeners, subscriptions

## Conventions
- Files: PascalCase.tsx for components, camelCase.ts for utilities
- CSS: Tailwind utilities + semantic tokens, no inline styles
- Commits: conventional commit messages
