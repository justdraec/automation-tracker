# API Design Skill

REST API and Edge Function design patterns for the Automation Opportunity Tracker.

## Edge Function Structure
- CORS headers as reusable constant
- OPTIONS handler for preflight
- Request validation (method, body shape)
- Error responses: `{ error: string, details?: string }` with appropriate HTTP status
- Success responses: `{ data: T }` with 200

## Supabase REST API
- Table: `opportunities` with RLS (planned Phase 4)
- CRUD via `@supabase/supabase-js` client
- Filtering: use Supabase query builders, not client-side
- Pagination: planned for Phase 3

## OpenAI Integration
- Model: GPT-4o via Edge Function (never direct from browser)
- System prompt in Edge Function source
- Temperature: 0.7, max_tokens: 1024
- Structured output: JSON in fenced code blocks
