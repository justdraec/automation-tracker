import { useState } from 'react'
import { Search, ChevronDown, ChevronUp, Pencil, Trash2, FileText } from 'lucide-react'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { getScoreColor } from '@/lib/scoring'
import BuilderPanel from '@/components/BuilderPanel'

interface Props {
  entries: Opportunity[]
  builderMode: boolean
  onUpdate: (opp: Opportunity) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: OpportunityStatus) => void
  onSwitchToSubmit: () => void
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
  const statusFilters: (string)[] = ['all', 'pending-review', 'not-started', 'in-progress', 'built', 'on-hold']

  return (
    <div>
      {/* Search + Sort */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-hint" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search opportunities..."
            className="w-full pl-9 pr-3 py-2 rounded-full border border-border bg-app-surface text-sm
                       focus:border-step2 focus:outline-none focus:ring-2 focus:ring-step2/10"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-full border border-border bg-app-surface px-3 py-2 text-xs text-text-muted cursor-pointer"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="score-high">Highest score</option>
          <option value="score-low">Lowest score</option>
          <option value="time-saved">Most time saved</option>
        </select>
      </div>

      {/* Priority filters */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {priorityFilters.map(f => (
          <button key={f} onClick={() => setPriorityFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
              ${priorityFilter === f ? 'bg-[#1c1917] dark:bg-[#2a2d4a] text-white border-transparent' : 'border-border text-text-muted hover:bg-app-bg'}`}>
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap items-center">
        {statusFilters.map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
              ${statusFilter === f ? 'bg-[#1c1917] dark:bg-[#2a2d4a] text-white border-transparent' : 'border-border text-text-muted hover:bg-app-bg'}`}>
            {f === 'all' ? 'All status' : STATUS_LABELS[f as OpportunityStatus] || f}
          </button>
        ))}
        <span className="text-xs text-text-hint ml-auto">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Entries */}
      {!filtered.length ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-[14px] bg-app-surface">
          <p className="text-text-hint font-medium">{search ? 'No matches found' : 'No opportunities yet'}</p>
          <p className="text-text-hint/60 text-sm mt-1">
            {search ? 'Try a different search.' : 'Go to the Submit tab to start a conversation.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(e => {
            const sc = getScoreColor(e.score)
            const isExpanded = expanded.has(e.id)
            const isBuilderOpen = builderMode && builderOpen.has(e.id)
            const statusCls = STATUS_COLORS[(e.status || 'pending-review') as OpportunityStatus] || ''

            return (
              <div key={e.id} className={`bg-app-surface border border-border rounded-[14px] p-5 transition-shadow hover:shadow-md
                border-l-4 ${e.priority === 'high' ? 'border-l-red-500' : e.priority === 'medium' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>

                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-sm">{e.area || 'Untitled'}</h3>
                    {e.owner && <p className="text-xs text-text-hint mt-0.5">Owner: {e.owner}{e.frequency ? ` · ${e.frequency}` : ''}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                         style={{ background: sc.bg, color: sc.col }}>
                      {e.score}
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCls}`}>
                      {STATUS_LABELS[(e.status || 'pending-review') as OpportunityStatus]}
                    </span>
                    {e.category && <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-text-muted">{e.category}</span>}
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-text-muted">{e.tool}</span>
                  </div>
                </div>

                {/* Pain point */}
                <p className="text-xs text-text-muted leading-relaxed">{e.pain}</p>

                {/* Success metric */}
                {e.metric && (
                  <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-0.5">Success metric</p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">{e.metric}</p>
                  </div>
                )}

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2 animate-fade-in">
                    {(e.clientTrigger || e.clientSteps) && (
                      <div className="p-3 bg-step1-bg border border-step1-border rounded-lg">
                        <p className="text-[10px] font-bold text-step1 uppercase mb-2">Client Discovery</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="font-bold text-text-hint text-[10px] uppercase">Trigger</span><p className="text-text-primary mt-0.5">{e.clientTrigger || '--'}</p></div>
                          <div><span className="font-bold text-text-hint text-[10px] uppercase">Input</span><p className="text-text-primary mt-0.5">{e.clientInput || '--'}</p></div>
                          <div><span className="font-bold text-text-hint text-[10px] uppercase">Steps</span><p className="text-text-primary mt-0.5 whitespace-pre-line">{e.clientSteps || '--'}</p></div>
                          <div><span className="font-bold text-text-hint text-[10px] uppercase">Output</span><p className="text-text-primary mt-0.5">{e.clientOutput || '--'}</p></div>
                        </div>
                      </div>
                    )}
                    {(e.trigger || e.steps) && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="font-bold text-text-hint text-[10px] uppercase">Tech Trigger</span><p>{e.triggerType ? `[${e.triggerType}] ` : ''}{e.trigger || '--'}</p></div>
                        <div><span className="font-bold text-text-hint text-[10px] uppercase">Error</span><p>{e.error || '--'}</p></div>
                      </div>
                    )}
                    {e.tools && <div className="text-xs"><span className="font-bold text-text-hint text-[10px] uppercase">Tools</span><p>{e.tools}</p></div>}
                    {e.timesaved && <div className="text-xs"><span className="font-bold text-text-hint text-[10px] uppercase">Time saved</span><p>{e.timesaved} hrs/week</p></div>}
                    {e.workflowId && (
                      <div className="p-2.5 bg-ai-bg border border-ai-border rounded-lg text-xs">
                        <span className="font-bold text-ai text-[10px] uppercase">Deployed</span>
                        <p className="text-text-primary">{e.workflowPlatform} | ID: {e.workflowId}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
                  <span className="text-[10px] text-text-hint mr-auto">{e.timestamp}</span>
                  {builderMode && (
                    <select
                      value={e.status || 'pending-review'}
                      onChange={ev => onStatusChange(e.id, ev.target.value as OpportunityStatus)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold cursor-pointer ${statusCls}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => toggleExpand(e.id)} className="text-xs text-text-muted hover:text-text-primary px-2 py-1 rounded-lg hover:bg-app-bg transition-colors flex items-center gap-1">
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {isExpanded ? 'Less' : 'Details'}
                  </button>
                  <button onClick={() => {
                    if (confirm('Delete "' + (e.area || 'this opportunity') + '"? This cannot be undone.')) onDelete(e.id)
                  }} className="text-xs text-text-hint hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                    <Trash2 size={12} /> Delete
                  </button>
                  {builderMode && (
                    <button onClick={() => {
                      setBuilderOpen(prev => {
                        const next = new Set(prev)
                        next.has(e.id) ? next.delete(e.id) : next.add(e.id)
                        return next
                      })
                    }} className="text-xs text-step2-text hover:bg-step2-bg px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                      <Pencil size={12} /> {isBuilderOpen ? 'Close' : 'Build'}
                    </button>
                  )}
                </div>

                {/* Builder panel */}
                {isBuilderOpen && (
                  <BuilderPanel entry={e} onSave={onUpdate} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
