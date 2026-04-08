import { useState } from 'react'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import { getScoreColor } from '@/lib/scoring'
import BuilderPanel from '@/components/BuilderPanel'
import Icon from '@/components/Icon'

interface Props {
  entries: Opportunity[]
  builderMode: boolean
  onUpdate: (opp: Opportunity) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: OpportunityStatus) => void
  onSwitchToSubmit: () => void
}

const STATUS_STYLES: Record<OpportunityStatus, string> = {
  'pending-review': 'bg-surface-container-high text-on-surface-variant',
  'not-started': 'bg-surface-container-high text-on-surface-variant',
  'in-progress': 'bg-tertiary-fixed text-tertiary',
  'built': 'bg-green-100 text-[#008545]',
  'on-hold': 'bg-error-container text-error',
}

function ScoreBadge({ score }: { score: number }) {
  let cls = 'bg-surface-container text-on-surface-variant'
  if (score >= 7.5) cls = 'bg-tertiary-fixed text-tertiary'
  else if (score >= 5) cls = 'bg-primary-fixed text-primary'
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cls}`}>{score}/10</span>
}

function MetaItem({ label, value }: { label: string; value?: string | React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">{label}</p>
      <div className="text-sm text-on-surface font-medium">{value || '--'}</div>
    </div>
  )
}

export default function OpportunitiesList({ entries, builderMode, onUpdate, onDelete, onStatusChange, onSwitchToSubmit }: Props) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [builderOpen, setBuilderOpen] = useState<Set<number>>(new Set())

  let filtered = [...entries]
  if (priorityFilter !== 'all') filtered = filtered.filter(e => e.priority === priorityFilter)
  if (statusFilter !== 'all') filtered = filtered.filter(e => (e.status || 'pending-review') === statusFilter)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      (e.area || '').toLowerCase().includes(q) ||
      (e.owner || '').toLowerCase().includes(q) ||
      (e.pain || '').toLowerCase().includes(q) ||
      (e.tools || '').toLowerCase().includes(q)
    )
  }
  switch (sortBy) {
    case 'oldest': filtered.reverse(); break
    case 'score-high': filtered.sort((a, b) => b.score - a.score); break
    case 'score-low': filtered.sort((a, b) => a.score - b.score); break
    case 'time-saved': filtered.sort((a, b) => (parseFloat(b.timesaved) || 0) - (parseFloat(a.timesaved) || 0)); break
  }

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const priorityFilters = ['all', 'high', 'medium', 'low'] as const
  const statusFilters: string[] = ['all', 'pending-review', 'not-started', 'in-progress', 'built', 'on-hold']

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight font-headline text-on-surface">Opportunities</h2>
            <p className="text-on-surface-variant/70 font-medium mt-1">{entries.length} captured · {entries.filter(e => e.priority === 'high').length} high priority</p>
          </div>
          <button onClick={onSwitchToSubmit} className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
            <Icon name="add" size={18} /> New
          </button>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search opportunities..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-outline-variant/30 bg-white text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant/40"
            />
          </div>
          <div className="relative">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-outline-variant/30 rounded-full px-4 pr-10 py-2.5 text-xs font-medium text-on-surface-variant cursor-pointer outline-none focus:ring-2 focus:ring-primary/10">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="score-high">Highest score</option>
              <option value="score-low">Lowest score</option>
              <option value="time-saved">Most time saved</option>
            </select>
            <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
          </div>
        </div>

        {/* Pill filters */}
        <div className="flex gap-1.5 mb-2 flex-wrap">
          {priorityFilters.map(f => (
            <button key={f} onClick={() => setPriorityFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${priorityFilter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mb-6 flex-wrap items-center">
          {statusFilters.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${statusFilter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}>
              {f === 'all' ? 'All status' : STATUS_LABELS[f as OpportunityStatus] || f}
            </button>
          ))}
          <span className="text-xs text-on-surface-variant/50 ml-auto font-medium">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Cards */}
        {!filtered.length ? (
          <div className="text-center py-16 border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-lowest">
            <Icon name="search_off" size={40} className="text-on-surface-variant/20 mb-3" />
            <p className="text-on-surface-variant font-medium">{search ? 'No matches found' : 'No opportunities yet'}</p>
            <p className="text-on-surface-variant/50 text-sm mt-1">{search ? 'Try a different search.' : 'Start a conversation to capture one.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(e => {
              const isExpanded = expanded.has(e.id)
              const isBuilderOpen = builderMode && builderOpen.has(e.id)
              const status = (e.status || 'pending-review') as OpportunityStatus

              return (
                <div key={e.id} className="bg-surface-container-lowest rounded-2xl p-6 relative overflow-hidden hover:shadow-md transition-shadow">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[status]}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      {e.score > 0 && <ScoreBadge score={e.score} />}
                      {e.category && <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-container text-on-surface-variant">{e.category}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {builderMode && (
                        <select value={status} onChange={ev => onStatusChange(e.id, ev.target.value as OpportunityStatus)}
                          className="text-[11px] px-2.5 py-1 rounded-full border border-outline-variant bg-white font-medium cursor-pointer outline-none">
                          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      )}
                      {builderMode && (
                        <button onClick={() => { setBuilderOpen(prev => { const n = new Set(prev); n.has(e.id) ? n.delete(e.id) : n.add(e.id); return n }) }}
                          className={`p-2 rounded-xl transition-all ${isBuilderOpen ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low hover:bg-primary-fixed text-on-surface-variant hover:text-primary'}`}>
                          <Icon name="build" size={18} />
                        </button>
                      )}
                      {builderMode && (
                        <button onClick={() => { if (confirm('Delete "' + (e.area || 'this opportunity') + '"?')) onDelete(e.id) }}
                          className="p-2 bg-surface-container-low hover:bg-error-container hover:text-error text-on-surface-variant/50 rounded-xl transition-all">
                          <Icon name="delete" size={18} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title + pain */}
                  <h3 className="text-xl font-bold font-headline text-on-surface mb-1">{e.area || 'Untitled'}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed mb-4">{e.pain}</p>

                  {/* Meta grid */}
                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <MetaItem label="Owner" value={e.owner} />
                    <MetaItem label="Frequency" value={e.frequency} />
                    <MetaItem label="Tools" value={
                      e.toolChips?.length ? (
                        <div className="flex gap-1 flex-wrap">
                          {e.toolChips.map(t => <span key={t} className="px-2 py-0.5 bg-surface-container-low rounded text-[11px] font-medium">{t}</span>)}
                        </div>
                      ) : e.tools
                    } />
                    <MetaItem label="Time Saved" value={e.timesaved ? <span className="text-primary font-bold">{e.timesaved}h/week</span> : undefined} />
                  </div>

                  {/* Success metric */}
                  {e.metric && (
                    <div className="bg-[#008545] text-white rounded-xl p-4 mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">Success Metric</p>
                      <p className="text-sm font-medium">{e.metric}</p>
                    </div>
                  )}

                  {/* Expand button */}
                  <button onClick={() => toggleExpand(e.id)} className="flex items-center gap-1 text-xs text-on-surface-variant/60 hover:text-primary transition-colors font-medium">
                    <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={18} />
                    {isExpanded ? 'Less details' : 'Discovery details'}
                  </button>

                  {/* Expanded discovery details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/10 animate-fade-in">
                      {(e.clientTrigger || e.clientSteps) && (
                        <div className="bg-tertiary-fixed rounded-2xl p-5 mb-3">
                          <p className="text-[10px] font-bold text-on-tertiary-fixed uppercase tracking-widest mb-3">Client Discovery</p>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div><span className="font-bold text-on-tertiary-fixed-variant text-[10px] uppercase">Trigger</span><p className="text-on-surface mt-1">{e.clientTrigger || '--'}</p></div>
                            <div><span className="font-bold text-on-tertiary-fixed-variant text-[10px] uppercase">Input Data</span><p className="text-on-surface mt-1">{e.clientInput || '--'}</p></div>
                            <div><span className="font-bold text-on-tertiary-fixed-variant text-[10px] uppercase">Steps</span><p className="text-on-surface mt-1 whitespace-pre-line">{e.clientSteps || '--'}</p></div>
                            <div><span className="font-bold text-on-tertiary-fixed-variant text-[10px] uppercase">Output</span><p className="text-on-surface mt-1">{e.clientOutput || '--'}</p></div>
                          </div>
                        </div>
                      )}
                      {(e.trigger || e.steps) && (
                        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                          <div className="bg-surface-container-low p-3 rounded-xl"><span className="font-bold text-on-surface-variant text-[10px] uppercase">Tech Trigger</span><p className="mt-1">{e.triggerType ? `[${e.triggerType}] ` : ''}{e.trigger || '--'}</p></div>
                          <div className="bg-surface-container-low p-3 rounded-xl"><span className="font-bold text-on-surface-variant text-[10px] uppercase">Error Handling</span><p className="mt-1">{e.error || '--'}</p></div>
                        </div>
                      )}
                      {e.desired && (
                        <div className="bg-surface-container-low p-4 rounded-xl mb-3">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Desired State</p>
                          <p className="text-sm text-on-surface">{e.desired}</p>
                        </div>
                      )}
                      {/* Scoring */}
                      {e.score > 0 && (
                        <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl">
                          <div className="score-donut w-12 h-12 text-sm font-bold flex-shrink-0"
                               style={{ background: `conic-gradient(${getScoreColor(e.score).col} ${Math.round(e.score / 10 * 360)}deg, #ccc3d8 ${Math.round(e.score / 10 * 360)}deg)` }}>
                            <span className="bg-surface-container-lowest w-8 h-8 rounded-full flex items-center justify-center" style={{ color: getScoreColor(e.score).col }}>{e.score}</span>
                          </div>
                          <div className="flex gap-4 text-xs">
                            <div><span className="text-on-surface-variant text-[10px] uppercase font-bold">Impact</span><p className="font-bold text-on-surface">{e.impact}/5</p></div>
                            <div><span className="text-on-surface-variant text-[10px] uppercase font-bold">Urgency</span><p className="font-bold text-on-surface">{e.urgency}/5</p></div>
                            <div><span className="text-on-surface-variant text-[10px] uppercase font-bold">Feasibility</span><p className="font-bold text-on-surface">{e.feasibility}/5</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Builder panel */}
                  {isBuilderOpen && <BuilderPanel entry={e} onSave={onUpdate} />}

                  {/* Timestamp */}
                  <p className="text-[10px] text-on-surface-variant/40 mt-3">{e.timestamp}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
