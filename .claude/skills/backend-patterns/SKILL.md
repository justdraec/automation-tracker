# Backend Patterns Skill

Supabase + Deno Edge Functions patterns for the Automation Opportunity Tracker.

## Supabase Client
- Single client instance in `src/lib/supabase.ts`
- Always destructure `{ data, error }` and handle errors
- Specify columns in `select()`, not `select('*')`
- Cast results: `return (data || []) as Type[]`

## Edge Functions
- Runtime: Deno (not Node.js)
- Env vars: `Deno.env.get('KEY')` not `process.env`
- CORS: include headers for browser requests
- API keys: stored in Supabase Secrets, never in source

## Data Model
- Types defined in `src/lib/types.ts`
- JSONB columns for arrays: processSteps, dependencies, mappings
- Status enum: pending-review, not-started, in-progress, built, on-hold
- Migrations in `supabase/migrations/`
