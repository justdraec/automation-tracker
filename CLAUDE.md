# CLAUDE.md — Automation Opportunity Tracker
> Project requirements document for Claude Code.
> Read this file fully before making any changes to the codebase.

---

## Project Overview

**App name:** Automation Opportunity Tracker
**Live URL:** https://automation-tracker-app.vercel.app
**GitHub repo:** https://github.com/justdraec/automation-tracker
**Stack:** React 18 + Vite + TypeScript + TailwindCSS + Supabase + OpenAI GPT-4o (via Supabase Edge Functions)
**Deployment:** Vercel (static frontend) + Supabase (database + edge functions)

This is a tool for capturing, scoring, prioritizing, and managing business automation opportunities. It uses an AI chat discovery flow to collect structured data about manual processes, scores them using a weighted rubric, and generates technical PRDs for developers or automation builders.

The current version is a personal/team tool. The goal is to evolve it into a multi-tenant SaaS product.

---

## Directory Structure

```
/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── src/
│   ├── main.tsx                     # App entry point
│   ├── App.tsx                      # Root component: layout, tabs, state, header
│   ├── index.css                    # CSS variables, global styles, Tailwind base
│   ├── vite-env.d.ts
│   ├── components/
│   │   ├── ChatDiscovery.tsx        # AI chat flow for capturing new opportunities
│   │   ├── OpportunitiesList.tsx    # Filterable list with expand/collapse and builder panel
│   │   ├── BuildList.tsx            # Ranked table + PRD generator
│   │   ├── BuilderPanel.tsx         # Full form for configuring an opportunity (builder mode)
│   │   ├── SettingsModal.tsx        # Supabase config, score weights, export/import
│   │   └── ErrorBoundary.tsx        # React error boundary with reload/retry UI
│   └── lib/
│       ├── types.ts                 # All TypeScript types, interfaces, constants, emptyOpportunity()
│       ├── supabase.ts              # Supabase client + all DB functions + callChatDiscovery()
│       ├── scoring.ts               # Score calculation, priority, color, labels, calibration text
│       ├── workflow-builder.ts      # n8n + Make.com workflow JSON generation
│       └── prd-generator.ts         # Full markdown + plain text PRD generators (currently unused)
└── supabase/
    └── functions/
        └── chat-discovery/
            └── index.ts             # Deno edge function: receives messages, calls OpenAI GPT-4o
```

---

## Tech Stack Details

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | React 18 with TypeScript | Vite bundler |
| Styling | Tailwind CSS v3 + CSS custom properties | CSS vars for theming, Tailwind for layout |
| Icons | lucide-react | |
| Database | Supabase (PostgreSQL) | Table: `opportunities` |
| Auth | None currently | Needs Supabase Auth |
| AI chat | OpenAI GPT-4o | Called via Supabase Edge Function |
| Edge function runtime | Deno (Supabase Functions) | `supabase/functions/chat-discovery/index.ts` |
| Deployment | Vercel | Static build from `dist/` |
| Unused dependency | react-router-dom | Installed but never used -- remove it |

---

## Data Model

The core data type is `Opportunity` defined in `src/lib/types.ts`. See that file for the full interface with 50+ fields spanning discovery, tech spec, validation, deployment, and metadata.

---

## Scoring Logic (`src/lib/scoring.ts`)

Score = `(impact * 0.40 + urgency * 0.35 + feasibility * 0.25) / 5 * 10`

Default weights: Impact 40%, Urgency 35%, Feasibility 25%.
Weights are configurable via Settings and stored in `localStorage` under key `yp-score-weights`.

Priority thresholds:
- `score >= 7.5` -> High
- `score >= 5.0` -> Medium
- `score < 5.0` -> Low

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |

Set these in Vercel Dashboard -> Project Settings -> Environment Variables for production.
Set them in `.env` locally (never commit `.env`).

The OpenAI API key lives in Supabase -> Edge Functions -> Secrets as `OPENAI_API_KEY`. It is never exposed to the frontend.

---

## Prioritized Work Order

### Phase 1 -- Security & Stability (Do First)
1. Move Supabase credentials to env vars
2. Add `.env`, `.env.example`, `.gitignore`
3. Gate Delete behind builder mode
4. Fix builder password fallback
5. Add error boundaries
6. Replace chat auto-submit with explicit confirm button
7. Fix ID generation (omit from insert, let Supabase auto-generate)

### Phase 2 -- UX Fixes
8. Wire up `prd-generator.ts` in BuildList
9. Remove PRD builder mode gate
10. Remove unused `react-router-dom`
11. Add loading skeleton
12. Add pagination
13. Add category filter
14. Add search to Build List

### Phase 3 -- New Features
15. CSV export
16. Duplicate opportunity
17. Activity log
18. Dashboard/analytics tab
19. Bulk status update
20. Opportunity templates

### Phase 4 -- SaaS Architecture
21. Supabase Auth (sign in / sign up)
22. Organizations + members tables
23. Row Level Security policies
24. Role-based permissions (replace builder password)

### Phase 5 -- Integrations
25. Real n8n deploy integration
26. Real Make.com deploy integration
27. Workflow status sync

---

## Code Style and Conventions

- All components are functional React components with TypeScript
- Props interfaces are defined inline at the top of each component file
- CSS is handled exclusively through Tailwind utility classes + CSS custom properties in `index.css`
- No inline `style={{}}` tags except for dynamic values (e.g., score color, conic-gradient for the donut)
- Event handlers are named `handle{Action}` or `on{Action}` (prop names)
- `async/await` with `try/catch` for all Supabase calls
- All state that needs to persist across sessions goes in Supabase, not `localStorage`
- `localStorage` keys are prefixed with `yp-` (e.g., `yp-dark-mode`, `yp-builder-pw`)

---

## Notes for Claude Code

- Always read this file before making changes
- When fixing an issue, reference the issue number in your commit message
- Do not refactor code that is not related to the current task
- Do not change the visual design or Tailwind classes unless explicitly asked
- The `emptyOpportunity()` function in `src/lib/types.ts` is the canonical source of default values
- The Supabase edge function runs on Deno, not Node.js
- When adding new Supabase tables, also add TypeScript interfaces in `src/lib/types.ts`
