import { useState } from 'react'
import type { Opportunity } from '@/lib/types'
import { STATUS_LABELS, type OpportunityStatus } from '@/lib/types'
import { getScoreColor } from '@/lib/scoring'
import { generateMarkdownPRD, generatePlainPRD } from '@/lib/prd-generator'
import Icon from '@/components/Icon'

interface Props {
  entries: Opportunity[]
  builderMode: boolean
}

export default function BuildList({ entries, builderMode }: Props) {
  const [selectedPRD, setSelectedPRD] = useState('')
  const [prdFormat, setPrdFormat] = useState<'md' | 'plain'>('md')
  const [prdText, setPrdText] = useState('')
  const [showPRD, setShowPRD] = useState(false)
  const [search, setSearch] = useState('')

  const sorted = [...entries].sort((a, b) => b.score - a.score)
  const filtered = search
    ? sorted.filter(e => {
        const q = search.toLowerCase()
        return (e.area || '').toLowerCase().includes(q) ||
               (e.owner || '').toLowerCase().includes(q) ||
               (e.pain || '').toLowerCase().includes(q)
      })
    : sorted

  function generatePRD(id: string) {
    const e = entries.find(x => String(x.id) === id)
    if (!e) return
    const rank = sorted.indexOf(e) + 1
    const text = prdFormat === 'md' ? generateMarkdownPRD(e, rank) : generatePlainPRD(e, rank)
    setPrdText(text)
    setShowPRD(true)
  }

  // Stats
  const totalAnnualSaved = entries.reduce((a, e) => a + (parseFloat(e.timesaved) || 0), 0) * 52
  const aiCount = entries.filter(e => e.aiType && e.aiType !== 'none').length
  const aiRate = entries.length > 0 ? Math.round(aiCount / entries.length * 100) : 0
  const topReady = sorted.find(e => (e.status || 'pending-review') === 'not-started')

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight font-headline text-on-surface">Priority Build List</h2>
            <p className="text-on-surface-variant/70 font-medium mt-1">Ranked by ROI, technical feasibility, and AI impact.</p>
          </div>
        </div>

        {/* Stats bento */}
        <div className="grid grid-cols-12 gap-4 mb-8">
          <div className="col-span-8 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-2">Impact Analysis</p>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-headline font-extrabold text-on-surface">{totalAnnualSaved.toLocaleString()}</span>
              <span className="text-on-surface-variant font-medium pb-2">hours/year projected savings</span>
            </div>
            <p className="text-xs text-on-surface-variant/50 mt-2">Based on {entries.length} automation opportunities</p>
          </div>
          <div className="col-span-4 bg-gradient-to-br from-primary to-secondary rounded-2xl p-6 text-on-primary">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary/60 mb-2">AI Utilization Rate</p>
            <span className="text-5xl font-headline font-extrabold">{aiRate}%</span>
            <p className="text-xs text-on-primary/60 mt-2">{aiCount} of {entries.length} use AI</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-sm">
          <Icon name="search" size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter by name, owner, or pain..."
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-outline-variant/30 bg-white text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none transition-all placeholder:text-on-surface-variant/40"
          />
        </div>

        {/* Table */}
        {!filtered.length ? (
          <div className="text-center py-12 border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-lowest">
            <p className="text-on-surface-variant font-medium">No opportunities yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-outline-variant/10 rounded-2xl bg-surface-container-lowest">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-container-low/50 text-on-surface-variant/60 text-[11px] uppercase tracking-widest font-bold">
                  {['#', 'Opportunity', 'Score', 'Status', 'Tool', 'Build', 'Saves', 'AI', 'Metric'].map(h => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e, i) => {
                  const sc = getScoreColor(e.score)
                  const status = (e.status || 'pending-review') as OpportunityStatus
                  let scoreCls = 'bg-surface-container text-on-surface-variant'
                  if (e.score >= 7.5) scoreCls = 'bg-[#ffe1c0] text-[#905b00]'
                  else if (e.score >= 5) scoreCls = 'bg-[#ede0ff] text-[#7c3aed]'
                  const statusDot = status === 'built' ? 'bg-[#008545]' : status === 'in-progress' ? 'bg-tertiary-fixed-dim' : status === 'on-hold' ? 'bg-error' : 'bg-outline-variant'

                  return (
                    <tr key={e.id} className="border-t border-outline-variant/10 hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-on-surface-variant/40">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-on-surface">{e.area}</span>
                        {e.owner && <span className="block text-[10px] text-on-surface-variant mt-0.5">{e.owner}</span>}
                      </td>
                      <td className="px-4 py-3.5"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${scoreCls}`}>{e.score}</span></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${statusDot}`} />
                          <span className="text-xs font-medium text-on-surface-variant">{STATUS_LABELS[status]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-on-surface-variant">{e.tool}</td>
                      <td className="px-4 py-3.5 text-on-surface-variant">{e.buildtime || '--'}</td>
                      <td className="px-4 py-3.5 text-on-surface-variant">{e.timesaved ? `${e.timesaved} h/wk` : '--'}</td>
                      <td className="px-4 py-3.5">
                        {e.aiType && e.aiType !== 'none'
                          ? <Icon name="check_circle" size={18} className="text-primary-container" filled />
                          : <Icon name="radio_button_unchecked" size={18} className="text-on-surface/10" />}
                      </td>
                      <td className="px-4 py-3.5 text-on-surface-variant max-w-[200px] truncate">{e.metric || '--'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Insight cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="glass-card rounded-2xl p-6 border-l-4 border-tertiary-fixed-dim">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="rocket_launch" size={18} className="text-tertiary" />
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Build Recommendation</span>
            </div>
            {topReady ? (
              <p className="text-sm text-on-surface"><span className="font-bold">{topReady.area}</span> — Score {topReady.score}/10, saves {topReady.timesaved || '?'}h/week</p>
            ) : (
              <p className="text-sm text-on-surface-variant">No ready opportunities to recommend.</p>
            )}
          </div>
          <div className="glass-card rounded-2xl p-6 border-l-4 border-primary">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="insights" size={18} className="text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Resource Alert</span>
            </div>
            <p className="text-sm text-on-surface">{entries.filter(e => e.status === 'in-progress').length} automations in progress. {entries.filter(e => e.status === 'on-hold').length} on hold.</p>
          </div>
        </div>

        {/* PRD Generator — available to all users (no builderMode gate) */}
        {filtered.length > 0 && (
          <div className="mt-8 p-6 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-headline font-bold text-on-surface">Generate PRD</h4>
              <div className="flex gap-1 bg-surface-container-low rounded-full p-0.5">
                <button onClick={() => setPrdFormat('md')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${prdFormat === 'md' ? 'bg-white shadow text-on-surface' : 'text-on-surface-variant'}`}>Markdown</button>
                <button onClick={() => setPrdFormat('plain')} className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${prdFormat === 'plain' ? 'bg-white shadow text-on-surface' : 'text-on-surface-variant'}`}>Plain</button>
              </div>
            </div>
            <div className="flex gap-2 items-center mb-3">
              <div className="relative flex-1">
                <select value={selectedPRD} onChange={ev => { setSelectedPRD(ev.target.value); if (ev.target.value) generatePRD(ev.target.value) }}
                  className="w-full appearance-none bg-white border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/10">
                  <option value="">— Select an opportunity —</option>
                  {sorted.map((e, i) => <option key={e.id} value={e.id}>#{i + 1} {e.area} ({e.score}/10)</option>)}
                </select>
                <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </div>
            {showPRD && (
              <div className="animate-fade-in">
                <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface-variant">Generated PRD</span>
                    <div className="flex gap-2">
                      <button onClick={() => navigator.clipboard.writeText(prdText)} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                        <Icon name="content_copy" size={14} /> Copy
                      </button>
                      <button onClick={() => setShowPRD(false)} className="text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant">Close</button>
                    </div>
                  </div>
                  <pre className="p-4 text-xs text-on-surface-variant font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-surface-container-low">{prdText}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
