# Frontend Design Skill

React + TypeScript + Tailwind CSS frontend patterns for the Automation Opportunity Tracker.

## Design System
- CSS variables defined in `src/index.css` (light + dark mode)
- Tailwind tokens mapped in `tailwind.config.ts`
- Component library: Lucide React icons, custom form inputs
- Responsive: mobile-first, flex-wrap patterns, max-w-2xl for chat

## Patterns
- Components in `src/components/` as PascalCase.tsx
- Props interfaces defined inline
- Handler props: `onAction`, local: `handleAction`
- State from App.tsx passed down, not fetched in components
- Semantic color tokens over raw hex values
