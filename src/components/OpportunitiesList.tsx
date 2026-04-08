import { useState } from 'react'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
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
  'built': 'bg-surface-container-high text-[#008545]',
  'on-hold': 'bg-error-container text-error',
}

export default function OpportunitiesList({ entries, builderMode, onUpdate, onDelete, onStatusChange, onSwitchToSubmit }: Props) {
  const [search, setSearch] = useState('')
  const [builderOpen, setBuilderOpen] = useState<Set<number>>(new Set())

  let filtered = [...entries]
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      (e.area || '').toLowerCase().includes(q) ||
      (e.owner || '').toLowerCase().includes(q) ||
      (e.pain || '').toLowerCase().includes(q) ||
      (e.tools || '').toLowerCase().includes(q)
    )
  }

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

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search opportunities..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-outline-variant/30 bg-surface-container-lowest text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/40" />
        </div>

        {/* Cards */}
        {!filtered.length ? (
          <div className="text-center py-16 border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-lowest">
            <Icon name="search_off" size={40} className="text-on-surface-variant/20 mb-3" />
            <p className="text-on-surface-variant font-medium">{search ? 'No matches found' : 'No opportunities yet'}</p>
            <p className="text-on-surface-variant/50 text-sm mt-1">{search ? 'Try a different search.' : 'Start a conversation to capture one.'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map(e => {
              const status = (e.status || 'pending-review') as OpportunityStatus
              const isBuilderOpen = builderMode && builderOpen.has(e.id)
              const stepsArr = (e.clientSteps || e.steps || '').split('\n').filter(Boolean)

              return (
                <div key={e.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/10">
                  {/* Top bar: status + score + actions */}
                  <div className="flex items-center gap-2 px-6 pt-5 pb-3">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
                    {e.score > 0 && (
                      <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${e.score >= 7.5 ? 'bg-tertiary-fixed text-tertiary' : e.score >= 5 ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                        {e.score} SCORE
                      </span>
                    )}
                    <div className="flex-1" />
                    {builderMode && (
                      <select value={status} onChange={ev => onStatusChange(e.id, ev.target.value as OpportunityStatus)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-outline-variant bg-surface-container-lowest font-medium cursor-pointer outline-none">
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

                  {/* Title */}
                  <div className="px-6 pb-4">
                    <h3 className="text-xl font-bold font-headline text-on-surface mb-1">{e.area || 'Untitled'}</h3>
                  </div>

                  {/* Bento: Problem (8) + Success Metric (4) */}
                  <div className="grid grid-cols-12 gap-4 px-6 pb-4">
                    <div className="col-span-8 bg-surface-container-low rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name="report_problem" size={16} className="text-on-surface-variant" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">Problem Statement</p>
                      </div>
                      <p className="text-sm text-on-surface leading-relaxed mb-4">{e.pain || 'Not provided'}</p>
                      <div className="grid grid-cols-4 gap-3">
                        <div><p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Owner</p><p className="text-xs font-medium text-on-surface">{e.owner || '--'}</p></div>
                        <div><p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Frequency</p><p className="text-xs font-medium text-on-surface">{e.frequency || '--'}</p></div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Tools</p>
                          <div className="flex gap-1 flex-wrap">
                            {e.toolChips?.length ? e.toolChips.map(t => <span key={t} className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] font-medium">{t}</span>) : <span className="text-xs">{e.tools || '--'}</span>}
                          </div>
                        </div>
                        <div><p className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-0.5">Est. Time</p><p className="text-xs font-bold text-primary">{e.timesaved ? `${e.timesaved}h/week` : '--'}</p></div>
                      </div>
                    </div>
                    {e.metric && (
                      <div className="col-span-4 bg-[#008545] rounded-2xl p-5 text-white flex flex-col justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2">Target Success Metric</p>
                        <p className="text-sm font-bold leading-relaxed">{e.metric}</p>
                      </div>
                    )}
                    {!e.metric && <div className="col-span-4" />}
                  </div>

                  {/* Amber discovery bento */}
                  {(e.clientTrigger || e.clientSteps || e.clientInput || e.clientOutput) && (
                    <div className="mx-6 mb-4 bg-[#fef3c7] rounded-2xl p-5 border border-amber-200">
                      <div className="grid grid-cols-12 gap-5">
                        <div className="col-span-5 space-y-4">
                          {e.clientTrigger && (
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <Icon name="mail" size={14} className="text-amber-700" />
                                <p className="text-[9px] font-black uppercase tracking-widest text-amber-800">The Trigger</p>
                              </div>
                              <p className="text-xs text-amber-900">{e.clientTrigger}</p>
                            </div>
                          )}
                          {e.clientInput && (
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-amber-800 mb-1.5">Input Data</p>
                              <ul className="space-y-1">
                                {e.clientInput.split(',').map((item, i) => (
                                  <li key={i} className="flex items-center gap-1.5 text-xs text-amber-900">
                                    <Icon name="check" size={12} className="text-amber-700" /> {item.trim()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="col-span-7">
                          {stepsArr.length > 0 && (
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-amber-800 mb-2">Automated Steps</p>
                              <div className="grid grid-cols-2 gap-2">
                                {stepsArr.map((step, i) => (
                                  <div key={i} className="flex items-start gap-2 bg-white/60 rounded-xl p-2.5">
                                    <span className="text-[10px] font-bold text-amber-700 mt-0.5">{i + 1}.</span>
                                    <p className="text-[11px] text-amber-900">{step.replace(/^\d+\.\s*/, '')}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {e.clientOutput && (
                            <div className="mt-3 flex items-center gap-2">
                              <span className="px-2.5 py-0.5 bg-amber-200 rounded-full text-[9px] font-bold text-amber-800 uppercase">Output</span>
                              <p className="text-[11px] text-amber-900">{e.clientOutput}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="px-6 pb-4">
                    <p className="text-[10px] text-on-surface-variant/40">{e.timestamp}</p>
                  </div>

                  {/* Builder panel */}
                  {isBuilderOpen && (
                    <div className="px-6 pb-4">
                      <BuilderPanel entry={e} onSave={onUpdate} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
