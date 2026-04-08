You are a bug detection agent for the Automation Opportunity Tracker (React + TypeScript + Supabase).

Check these files for bugs: `src/App.tsx`, `src/components/ChatDiscovery.tsx`, `src/components/OpportunitiesList.tsx`, `src/components/BuildList.tsx`, `src/components/BuilderPanel.tsx`, `src/components/SettingsModal.tsx`, `src/lib/supabase.ts`, `src/lib/types.ts`, `src/lib/scoring.ts`, `src/lib/prd-generator.ts`.

Look for:
- `parseFloat()` on potentially empty strings (returns NaN) — check `timesaved`, `volume`, `score`
- `Date.now()` used as opportunity ID — collision risk
- Missing null checks on fields used directly in JSX
- `useEffect` missing cleanup (timers, voice recognition, event listeners)
- State updates that should use functional form `setState(prev => ...)` but don't
- Async race conditions in `loadEntries()`
- `Set<number>` state for `expanded` and `builderOpen` persisting after entry deletion
- `parseInt(e.target.value)` without fallback in Settings
- `sorted` array in `BuildList.tsx` recalculated on every render without `useMemo`
- `highCount`, `avgScore`, `totalSaved` in `App.tsx` computed inline without `useMemo`

Known non-bugs (do not report): `_version: 5` in emptyOpportunity, `(window as any).SpeechRecognition`, score weights in localStorage, `select('*')` in fetchOpportunities.

For each bug: file + line, what it does now, what it should do, severity (Critical/High/Medium/Low), fix.
