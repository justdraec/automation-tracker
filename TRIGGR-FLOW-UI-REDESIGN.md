# CLAUDE.md — UI Redesign: Automation Tracker → Triggr Flow Design System

> This document is the UI redesign brief for Claude Code.
> Read this fully before touching any files.
> This is a DESIGN-ONLY migration. Do not change business logic, data models, or Supabase functions.

---

## What We're Doing

We built the Automation Opportunity Tracker (React + Vite + TypeScript + Tailwind + Supabase). It works. Now we're replacing the UI with the Triggr Flow design system — a polished, production-grade interface built in Stitch. The reference designs are provided as static HTML files.

The goal is to make the working app look and feel like the Triggr Flow mockups. Keep every data model, hook, API call, and business logic intact. Only change what the user sees.

---

## Reference Design Files

These are the Triggr Flow screens we designed. Use them as the source of truth for colors, typography, spacing, component patterns, and layout.

| File | Maps To | Notes |
|------|---------|-------|
| `new-opportunity-combined.html` | `ChatDiscovery.tsx` | Collapsed header-nav + right context panel |
| `builder-validation-panel.html` | `BuilderPanel.tsx` + `BuildList.tsx` (detail view) | Builder validation UI, completeness checklist, score card |
| `opportunity-detail.html` | `OpportunitiesList.tsx` (expanded card) | Opportunity detail bento layout |
| `build-list.html` | `BuildList.tsx` (list view) | Priority table + stats overview |

All reference HTML files live in `/design-reference/` at the project root.

---

## Design System

### Colors

Replace the existing Tailwind color config in `tailwind.config.ts` with this:

```typescript
colors: {
  "primary":                 "#630ed4",
  "primary-container":       "#7c3aed",
  "on-primary":              "#ffffff",
  "on-primary-container":    "#ede0ff",
  "primary-fixed":           "#eaddff",
  "primary-fixed-dim":       "#d2bbff",
  "on-primary-fixed":        "#25005a",
  "on-primary-fixed-variant":"#5a00c6",
  "inverse-primary":         "#d2bbff",
  "secondary":               "#4648d4",
  "secondary-container":     "#6063ee",
  "on-secondary":            "#ffffff",
  "on-secondary-container":  "#fffbff",
  "secondary-fixed":         "#e1e0ff",
  "secondary-fixed-dim":     "#c0c1ff",
  "on-secondary-fixed":      "#07006c",
  "on-secondary-fixed-variant": "#2f2ebe",
  "tertiary":                "#704500",
  "tertiary-container":      "#905b00",
  "on-tertiary":             "#ffffff",
  "on-tertiary-container":   "#ffe1c0",
  "tertiary-fixed":          "#ffddb8",
  "tertiary-fixed-dim":      "#ffb95f",
  "on-tertiary-fixed":       "#2a1700",
  "on-tertiary-fixed-variant":"#653e00",
  "surface":                 "#fcf8ff",
  "surface-dim":             "#dbd6fb",
  "surface-bright":          "#fcf8ff",
  "surface-container-lowest":"#ffffff",
  "surface-container-low":   "#f6f1ff",
  "surface-container":       "#f0ebff",
  "surface-container-high":  "#eae5ff",
  "surface-container-highest":"#e3dfff",
  "on-surface":              "#1a1833",
  "on-surface-variant":      "#4a4455",
  "surface-variant":         "#e3dfff",
  "inverse-surface":         "#2f2d49",
  "inverse-on-surface":      "#f3eeff",
  "surface-tint":            "#732ee4",
  "outline":                 "#7b7487",
  "outline-variant":         "#ccc3d8",
  "background":              "#fcf8ff",
  "on-background":           "#1a1833",
  "error":                   "#ba1a1a",
  "error-container":         "#ffdad6",
  "on-error":                "#ffffff",
  "on-error-container":      "#93000a",
}
```

### Typography

```typescript
fontFamily: {
  headline: ["Manrope", "sans-serif"],
  body:     ["Inter", "sans-serif"],
  label:    ["Inter", "sans-serif"],
}
```

Add these Google Fonts to `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="crossorigin" href="https://fonts.gstatic.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

### Icons

Replace all current icons with **Material Symbols Outlined**. Use `<span class="material-symbols-outlined">icon_name</span>`. For filled variants, add: `style="font-variation-settings: 'FILL' 1;"`. See the reference HTML files for icon names used throughout.

Add this to `index.css`:
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
  display: inline-block;
}
```

### Border Radius

```typescript
borderRadius: {
  DEFAULT: "0.25rem",
  lg:      "0.5rem",
  xl:      "0.75rem",
  "2xl":   "1rem",
  "3xl":   "1.5rem",
  full:    "9999px",
}
```

---

## App Layout (App.tsx)

### Current Layout

The current app uses a tab-based layout: `['discover', 'list', 'build']` tabs rendered as a horizontal nav in a top header bar.

### New Layout

Replace with a **persistent left sidebar + main content area** layout.

```
┌─────────────────────────────────────────────────────┐
│  HEADER (h-16, sticky, bg-white/80 backdrop-blur)   │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│  LEFT    │         MAIN CONTENT AREA               │
│  SIDEBAR │         (flex-1, overflow)               │
│  (256px) │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

**Sidebar items (in order):**
1. Logo: Triggr Flow + "Opportunity Tracker" subtext
2. "New Opportunity" CTA button (gradient, rounded-full)
3. Navigation links:
   - AI Discovery → maps to `tab === 'discover'`
   - Build List → maps to `tab === 'build'`
   - Analytics → disabled for now, show coming soon tooltip
   - Automation → disabled for now
4. History section (bottom of nav) — show last 3 opportunity names
5. Footer:
   - Dark Mode toggle
   - Builder Mode link
   - Settings link

**Active nav item style:**
```
border-l-4 border-primary bg-gradient-to-r from-primary-container/10 to-transparent text-primary font-semibold
```

**Inactive nav item style:**
```
text-on-surface/60 hover:bg-violet-50/80 transition-colors rounded-lg font-medium
```

**Header (top bar):**
- Left: breadcrumb showing current section
- Center: search input (`bg-surface-container-low`, `rounded-full`)
- Right: notifications icon, help icon, user avatar

---

## Component: ChatDiscovery.tsx

**Reference:** `new-opportunity-combined.html`

### Layout

```
Header bar:
  [SmartToy icon] Discovery Assistant
  TRAINING: B2B SaaS Growth Model label
  [Strategic Draft badge]  [⋮ menu]

Chat area (flex-1 scroll):
  max-w-3xl mx-auto, space-y-10

Input bar (sticky bottom):
  [📎] [text input] [➚ send button]
  "Press / for commands"  "Clear History"

RIGHT PANEL (w-[300px], fixed):
  Header: "Opportunity Discovery"
  Sub: opportunity name or "Starting discovery..."
  Pulse dot + "Mapping sequence logic..."
  ---
  Model Accuracy: big number + progress bar
  Active Constraints: list with icons
  Sequence Steps: vertical timeline
  ---
  [Execute Current Flow] button
  [✨ Optimization Active] button
```

### Chat Message Styles

**AI message:**
```tsx
<div className="flex gap-5">
  <div className="flex-shrink-0 w-8 h-8 mt-1 text-primary/30">
    <span className="material-symbols-outlined text-2xl">forum</span>
  </div>
  <div className="space-y-4 max-w-2xl">
    {/* message content */}
  </div>
</div>
```

**User message:**
```tsx
<div className="flex flex-row-reverse gap-5">
  {/* avatar */}
  <div className="bg-primary text-white p-4 rounded-3xl rounded-tr-none max-w-lg shadow-lg shadow-primary/15">
    {/* message text */}
  </div>
</div>
```

**AI thinking/action card:**
```tsx
<div className="bg-white border border-outline-variant/20 rounded-2xl p-6 shadow-sm">
  <div className="flex items-center gap-2 mb-3">
    <span className="material-symbols-outlined text-primary text-[18px]">insights</span>
    <span className="text-xs font-black uppercase text-primary tracking-widest">Strategy Adjusted</span>
  </div>
  {/* content */}
</div>
```

**Suggestion option cards (shown when AI presents choices):**
```tsx
<div className="grid grid-cols-2 gap-3">
  <button className="text-left p-4 rounded-2xl bg-white border border-outline-variant/20 hover:border-primary/40 hover:shadow-lg transition-all group">
    <p className="font-bold text-sm mb-1 group-hover:text-primary">{option.title}</p>
    <p className="text-xs text-on-surface-variant">{option.description}</p>
  </button>
</div>
```

**Completion/confirmation state** (addresses Issue #4 from CLAUDE.md — replace auto-submit):
```tsx
{showConfirm && (
  <div className="bg-surface-container-low border-2 border-primary/20 rounded-2xl p-6 text-center space-y-4">
    <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
    <h3 className="font-headline font-bold text-xl">Discovery Complete</h3>
    <p className="text-on-surface-variant text-sm">Review the opportunity details before saving.</p>
    <button
      onClick={() => handleCompletion(completionData)}
      className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
    >
      Save Opportunity
    </button>
  </div>
)}
```

**Input bar:**
```tsx
<div className="relative bg-white border border-outline-variant/30 rounded-full flex items-center px-2 py-2 shadow-xl focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
  <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors">
    <span className="material-symbols-outlined">attach_file</span>
  </button>
  <input className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4 placeholder:text-on-surface-variant/40" ... />
  <button className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-secondary shadow-lg">
    <span className="material-symbols-outlined text-xl">arrow_upward</span>
  </button>
</div>
```

**Right context panel** (shows during active discovery):
```tsx
<aside className="w-[300px] bg-white border-l border-outline-variant/10 flex flex-col shrink-0 overflow-y-auto">
  {/* Opportunity Discovery header */}
  {/* Model Accuracy card: score % + progress bar */}
  {/* Active constraints list */}
  {/* Sequence steps timeline */}
  {/* Execute CTA button */}
</aside>
```

---

## Component: OpportunitiesList.tsx

**Reference:** `opportunity-detail.html`

### List View (cards)

Replace the current expand/collapse card with a cleaner card design:

```tsx
<div className="bg-surface-container-lowest rounded-2xl p-6 relative overflow-hidden hover:shadow-md transition-shadow">
  {/* Top row: status badge, score badge, actions */}
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-2">
      <StatusBadge status={e.status} />
      <ScoreBadge score={e.score} priority={e.priority} />
    </div>
    <div className="flex items-center gap-2">
      {/* PRD, Builder (if builderMode), Delete (if builderMode) */}
    </div>
  </div>
  
  {/* Title + description */}
  <h3 className="text-xl font-bold font-headline text-on-surface mb-1">{e.area}</h3>
  <p className="text-on-surface-variant text-sm leading-relaxed mb-4">{e.pain}</p>
  
  {/* Meta row: owner, frequency, tools, time */}
  <div className="grid grid-cols-4 gap-4">
    <MetaItem label="Owner" value={e.owner} />
    <MetaItem label="Frequency" value={e.frequency} />
    <MetaItem label="Tools" value={<ToolChips tools={e.toolChips} />} />
    <MetaItem label="Est. Time" value={`${e.timesaved}h/week`} className="text-primary" />
  </div>
</div>
```

### Expanded Detail View

When a card is expanded/clicked, show the full detail layout from `opportunity-detail.html`. Key sections:

**1. Hero header:**
- Status + score badges
- Big title (text-5xl font-extrabold font-headline)
- Subtitle description
- Action buttons: [PRD icon], [Builder wrench — primary-container], [Delete — hover:error]

**2. Problem Statement card** (`col-span-8`):
- Pain description
- 4-column meta: owner, frequency, tools (as chips), time saved

**3. Success Metric card** (`col-span-4`):
- Green background (`bg-[#008545]`) with white text
- Big metric text

**4. Discovery Details (amber tinted)** (`col-span-12`):
- The Trigger (icon + trigger description)
- Input Data (checklist)
- Automated Steps (numbered grid of process steps)
- Output tag + processing time

**5. Activity Log** (`col-span-5`):
- Timeline of status changes, updates (use Feature 2 activity log when built)

### Status Badge

```tsx
const STATUS_STYLES = {
  'pending-review': 'bg-surface-container-high text-on-surface-variant',
  'not-started':    'bg-surface-container-high text-on-surface-variant',
  'in-progress':    'bg-tertiary-fixed text-tertiary',
  'built':          'bg-green-100 text-[#008545]',
  'on-hold':        'bg-error-container text-error',
}
```

### Score Badge

```tsx
// score >= 7.5 → amber/orange tint
// score >= 5.0 → purple tint
// score < 5.0  → gray tint
```

### Filters

Replace current filter UI with **pill-style filter rows**:
```tsx
<div className="flex items-center gap-2 flex-wrap">
  {priorities.map(p => (
    <button
      key={p}
      onClick={() => setPriorityFilter(p)}
      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
        priorityFilter === p
          ? 'bg-primary text-white'
          : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
      }`}
    >
      {p}
    </button>
  ))}
</div>
```

---

## Component: BuildList.tsx

**Reference:** `build-list.html`

### Page Header

```tsx
<div className="flex items-end justify-between mb-8">
  <div>
    <h2 className="text-4xl font-extrabold tracking-tight font-headline">Priority Build List</h2>
    <p className="text-on-surface-variant/70 font-medium mt-1">Ranked by ROI, technical feasibility, and AI impact.</p>
  </div>
  <div className="flex gap-2">
    <button>Filter</button>
    <button>Export</button>
  </div>
</div>
```

### Stats Bento (above table)

Two bento cards:
- **Impact Analysis** (col-span-8): "Projected Annual Savings" → total timesaved hours/year (sum from all entries × 52)
- **AI Utilization Rate** (col-span-4): gradient purple card, percentage of entries with `aiType !== 'none'`

### Table

Replace current table styles:

```
Columns: Rank | Opportunity | Score | Status | Tool | Est. Build | Hours Saved | AI? | Success Metric
```

**Header row:**
```tsx
<thead>
  <tr className="bg-surface-container-low/50 text-on-surface-variant/60 text-[11px] uppercase tracking-widest font-bold">
```

**Score badge in table:**
- score ≥ 7.5 → `bg-[#ffe1c0] text-[#ffb95f]` (amber)
- score ≥ 5.0 → `bg-[#ede0ff] text-[#7c3aed]` (purple)
- score < 5.0  → `bg-surface-container text-on-surface-variant` (gray)

**Status dot + label:**
```tsx
<div className="flex items-center gap-2">
  <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
  <span className="text-xs font-medium">{statusLabel}</span>
</div>
```

**AI column:**
```tsx
{e.aiType !== 'none'
  ? <span className="material-symbols-outlined text-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
  : <span className="material-symbols-outlined text-on-surface/10">radio_button_unchecked</span>
}
```

### Contextual Insight Cards (below table)

Two glass cards with left colored border:
- **Build Recommendation**: show top-scored ready opportunity
- **Resource Alert**: static or computed insight about workload

```tsx
<div className="glass-card rounded-2xl p-6 border-l-4 border-amber-400">
```

Add to `index.css`:
```css
.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
}
```

---

## Component: BuilderPanel.tsx

**Reference:** `builder-validation-panel.html`

### Layout

The builder panel maps to the right-column content in the reference. When `builderMode` is active and a user opens an opportunity for editing, show the validation panel layout:

**Left column (col-span-4):**
- Discovery Score card (large score number, impact/urgency/feasibility bars)
- Completeness Checklist (check required fields, show 5/7 Complete style badge)

**Right column (col-span-8):**
- Builder Validation Panel (indigo tinted: `bg-[#eef2ff]`)
- Header: wrench icon + "Builder Validation Panel" + "Drafting Mode" badge
- Two-column form:
  - Left: Trigger Type dropdown, Trigger Details textarea
  - Right: AI Involvement Yes/No toggle, AI Configuration summary card
- Build Tool selector (4 buttons: n8n, Make.com, Zapier, Custom SDK)
- Footer: [Save Validation] [Generate PRD]

### Completeness Checklist Logic

Check these fields and mark complete/incomplete:
```typescript
const COMPLETENESS_CHECKS = [
  { label: 'Input Definition',    check: (e: Opportunity) => !!e.clientInput },
  { label: 'Workflow Steps',      check: (e: Opportunity) => e.processSteps.length > 0 },
  { label: 'Trigger Type',        check: (e: Opportunity) => !!e.triggerType },
  { label: 'Output Destination',  check: (e: Opportunity) => !!e.output },
  { label: 'Success Metric',      check: (e: Opportunity) => !!e.metric },
  { label: 'Build Tool Selection',check: (e: Opportunity) => !!e.tool && e.tool !== 'TBD' },
  { label: 'Time Saved Est.',     check: (e: Opportunity) => !!e.timesaved },
]
```

Completed item icon: `check_circle` (filled, `text-[#008545]`)
Incomplete item: empty circle div `w-4 h-4 rounded-full border-2 border-primary/30`

Show `{complete}/{total} Complete` badge. If any incomplete, show error note at bottom.

### Discovery Context Card (bottom of panel)

Below the bento grid, show a full-width amber discovery card:
```tsx
<div className="mt-8 bg-tertiary-fixed rounded-2xl p-8 border-t-2 border-tertiary">
  <div className="flex items-start gap-6">
    <div className="bg-tertiary-container p-3 rounded-2xl text-on-tertiary-container">
      <span className="material-symbols-outlined text-3xl">lightbulb</span>
    </div>
    <div>
      <h4 className="text-xl font-bold mb-2">Discovery Context: {e.category}</h4>
      <p className="text-on-tertiary-fixed-variant leading-relaxed">{e.pain}</p>
    </div>
    <div className="ml-auto">
      <div className="bg-white/40 backdrop-blur p-4 rounded-xl border border-tertiary/20">
        <p className="text-[10px] font-bold uppercase tracking-tighter mb-1">Last Discovery Session</p>
        <p className="text-sm font-bold">{formatDate(e.timestamp)}</p>
      </div>
    </div>
  </div>
</div>
```

---

## Component: SettingsModal.tsx

Keep the modal structure but apply the new design system:
- Modal: `bg-surface-container-lowest rounded-2xl shadow-2xl`
- Section headers: `text-xs font-black uppercase tracking-widest text-on-surface-variant`
- Inputs: `bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20`
- Buttons: use the same button styles defined below

---

## Shared Component Patterns

### Primary Button
```tsx
<button className="px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
```

### Secondary Button
```tsx
<button className="px-6 py-2.5 rounded-full border border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container-low transition-colors">
```

### Danger Button (builder mode only)
```tsx
<button className="p-2.5 bg-surface-container-low hover:bg-error-container hover:text-error text-on-surface/70 rounded-xl transition-all">
  <span className="material-symbols-outlined">delete</span>
</button>
```

### Input
```tsx
<input className="w-full bg-white border border-secondary-fixed-dim rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary outline-none transition-all" />
```

### Select
```tsx
<div className="relative">
  <select className="w-full appearance-none bg-white border border-secondary-fixed-dim rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-secondary outline-none" />
  <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary-container pointer-events-none">unfold_more</span>
</div>
```

### Tool Chips (for displaying tool names)
```tsx
<div className="flex gap-1.5 flex-wrap">
  {e.toolChips.map(t => (
    <span key={t} className="px-2 py-0.5 bg-surface-container-low rounded text-[11px] font-medium">{t}</span>
  ))}
</div>
```

---

## index.css Changes

Replace existing CSS variable block with:

```css
:root {
  --color-primary: #630ed4;
  --color-primary-container: #7c3aed;
  --color-secondary: #4648d4;
  --color-surface: #fcf8ff;
  --color-surface-container-low: #f6f1ff;
  --color-on-surface: #1a1833;
  --color-on-surface-variant: #4a4455;
  --color-outline-variant: #ccc3d8;
  --color-tertiary-fixed: #ffddb8;
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--color-surface);
  color: var(--color-on-surface);
}

h1, h2, h3, .font-headline {
  font-family: 'Manrope', sans-serif;
}

.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  vertical-align: middle;
  display: inline-block;
}

.glass-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
}

.workflow-dot {
  background-image: radial-gradient(#7c3aed22 0.5px, transparent 0.5px);
  background-size: 16px 16px;
}

/* Custom scrollbar */
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #ccc3d8; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #7b7487; }

/* Dark mode (optional, implement after light mode is complete) */
.dark body {
  background-color: #1a1833;
  color: #fcf8ff;
}
```

---

## index.html Changes

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Triggr Flow — Automation Opportunity Tracker</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

## App.tsx Layout Refactor

### Current structure (tabs)
```
TopBar with tabs → ChatDiscovery | OpportunitiesList | BuildList
```

### New structure (sidebar layout)
```tsx
<div className="flex h-screen bg-background overflow-hidden">
  
  {/* Sidebar */}
  <aside className="w-[256px] shrink-0 bg-surface-container-low border-r border-outline-variant/10 flex flex-col py-6 px-4 h-full">
    {/* Logo */}
    {/* New Opportunity CTA */}
    {/* Nav links */}
    {/* History */}
    {/* Footer: Dark Mode, Builder Mode, Settings */}
  </aside>

  {/* Main */}
  <div className="flex-1 flex flex-col min-w-0">
    
    {/* Top bar */}
    <header className="h-16 flex justify-between items-center px-8 sticky top-0 bg-surface/80 backdrop-blur-md z-40 border-b border-outline-variant/10">
      {/* Breadcrumb */}
      {/* Search */}
      {/* Notifications + avatar */}
    </header>

    {/* Content */}
    <main className="flex-1 overflow-hidden">
      {tab === 'discover' && <ChatDiscovery ... />}
      {tab === 'list' && <OpportunitiesList ... />}
      {tab === 'build' && <BuildList ... />}
    </main>

  </div>

</div>
```

### Header Stats

The current header shows "X total, X high priority, avg score, total hours". In the new design, move these stats into the sidebar footer section (visible only when on certain tabs), and show a simpler breadcrumb in the top bar.

---

## Step-by-Step Implementation Order

Work through these in order. Don't skip ahead.

### Step 1: Setup
1. Update `tailwind.config.ts` with the new color palette and font families
2. Update `index.html` with Google Fonts links
3. Update `index.css` with the CSS variable block, glass-card, workflow-dot, scrollbar styles

### Step 2: App.tsx layout
1. Replace tab-based nav with sidebar + main layout
2. Keep all existing state (`tab`, `entries`, `builderMode`, `darkMode`, etc.)
3. Map sidebar nav clicks to `setTab()` calls
4. Move sync status indicator to sidebar footer (small dot next to "Triggr Flow" logo)

### Step 3: ChatDiscovery.tsx
1. Apply new message bubble styles (AI = left forum icon, User = right primary bubble)
2. Apply new input bar (rounded-full, attach + send buttons)
3. Replace auto-submit with explicit confirm button (Issue #4 fix)
4. Add right context panel (show during active chat, collapse when no active session)

### Step 4: OpportunitiesList.tsx
1. Replace card styles with new bento card design
2. Replace filter UI with pill-style filters
3. Add expanded detail view using opportunity-detail.html as reference
4. Gate delete button behind builderMode (Issue #2 fix)
5. Add inline edit for basic fields (Issue #12)

### Step 5: BuildList.tsx
1. Add page header + stats bento (projected savings + AI utilization)
2. Restyle table (new header, score badges, status dots, AI checkmarks)
3. Add contextual insight cards below table
4. Remove PRD builder mode gate (Issue #7 fix)
5. Wire up prd-generator.ts (Issue #6 fix)

### Step 6: BuilderPanel.tsx
1. Apply builder validation panel layout (score card + completeness checklist on left)
2. Apply indigo-tinted right panel styling
3. Add completeness checklist logic
4. Add discovery context card at bottom
5. Fix deploy button (Issue #11 fix)

### Step 7: SettingsModal.tsx
1. Apply new input/button styles
2. Add CSV export button (Feature 1)
3. Add "Weights are saved to this browser only" note (Issue #9)

---

## What NOT To Change

- Do not change any TypeScript types in `src/lib/types.ts`
- Do not change any Supabase functions in `src/lib/supabase.ts`
- Do not change the scoring logic in `src/lib/scoring.ts`
- Do not change the edge function in `supabase/functions/`
- Do not remove or rename any props passed between components
- Do not change how dark mode is toggled (keep the `dark` class on `<html>` approach)
- Do not refactor state management in App.tsx beyond the layout change

---

## Design Quality Checklist

Before marking any component done, verify:

- [ ] Uses Manrope for headings, Inter for body text
- [ ] Uses Material Symbols Outlined for all icons (no lucide-react in visible UI)
- [ ] Rounded corners match reference: cards use `rounded-2xl`, buttons use `rounded-full` or `rounded-xl`
- [ ] Color tokens match the Tailwind config above (no hardcoded hex values except `#008545` for success green)
- [ ] Score badges use the correct color variant based on score value
- [ ] Status badges use the correct style per status
- [ ] Builder-only actions (delete, duplicate, bulk update) are wrapped in `{builderMode && ...}`
- [ ] Input focus states use `focus:ring-2 focus:ring-primary/20`
- [ ] Hover transitions use `transition-all` or `transition-colors`
- [ ] Cards use `shadow-sm` or `shadow-md shadow-primary/5` — not heavy shadows
- [ ] The top header is always sticky with `bg-surface/80 backdrop-blur-md`
- [ ] No inline `style={{}}` tags except for dynamic values (score color, progress bar widths)

---

## Reference HTML Files Location

Copy all reference HTML files into the project:

```
/design-reference/
  ├── new-opportunity-combined.html    ← ChatDiscovery layout reference
  ├── builder-validation-panel.html   ← BuilderPanel layout reference
  ├── opportunity-detail.html         ← OpportunitiesList detail view reference
  └── build-list.html                 ← BuildList layout reference
```

When implementing any component, open the corresponding reference file first and match the visual structure exactly.

---

## Notes

- The app name in the UI should be "Triggr Flow" (display name). The underlying project/repo name stays the same.
- The "Opportunity Tracker" subtext appears below the logo in the sidebar.
- When `darkMode` is true, the sidebar background goes to `#1a1833`, surface goes to `#2f2d49`.
- All existing functional behavior (voice input, file attachments, real-time sync, builder password, scoring) stays intact. We're only changing how it looks.
