import { useState } from 'react'
import { Copy, FileText } from 'lucide-react'
import type { Opportunity } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS, type OpportunityStatus } from '@/lib/types'
import { getScoreColor } from '@/lib/scoring'

interface Props {
  entries: Opportunity[]
  builderMode: boolean
}

export default function BuildList({ entries, builderMode }: Props) {
  const [selectedPRD, setSelectedPRD] = useState('')
  const [prdFormat, setPrdFormat] = useState<'md' | 'plain'>('md')
  const [prdText, setPrdText] = useState('')
  const [showPRD, setShowPRD] = useState(false)

  const sorted = [...entries].sort((a, b) => b.score - a.score)

  function generatePRD(id: string) {
    const e = entries.find(x => String(x.id) === id)
    if (!e) return
    const rank = sorted.indexOf(e) + 1
    const hasAI = e.aiType && e.aiType !== 'none'
    const steps = e.processSteps || []
    const ws = parseFloat(e.timesaved) || 0

    let t = ''
    if (prdFormat === 'md') {
      t += `# Workflow PRD: ${e.area}\n> Rank: #${rank} | Score: ${e.score}/10 | Priority: ${(e.priority || 'medium').toUpperCase()}\n\n---\n\n`
      t += `## Problem\n${e.pain}\n\n`
      if (e.desired) t += `## Definition of Done\n${e.desired}\n\n`
      t += `## Details\n- **Owner:** ${e.owner || 'TBD'}\n- **Frequency:** ${e.frequency || 'TBD'}\n- **Tools:** ${e.tools || 'TBD'}\n- **Build tool:** ${e.tool}\n- **Build time:** ${e.buildtime || 'TBD'}\n\n`
      t += `## Technical Spec\n### Trigger: ${e.triggerType || 'TBD'}\n${e.trigger || e.clientTrigger || ''}\n\n`
      t += `### Input\n${e.input || e.clientInput || ''}\n\n### Steps\n`
      steps.forEach((s, i) => { t += `${i + 1}. ${s.desc}${s.tool ? ` **[${s.tool}]**` : ''}${s.isAI ? ' *[AI]*' : ''}\n` })
      t += `\n### Output\n${e.output || e.clientOutput || ''}\n\n`
      if (hasAI) t += `## AI: ${e.aiModel || 'TBD'} — ${e.aiTask || ''}\n\n`
      t += `## Success\n${e.metric}\n\n`
      if (ws > 0) t += `## ROI: ${ws} hrs/week saved\n\n`
      t += `## Claude Code Instructions\nBuild in **${e.tool}**:\n`
      steps.forEach((s, i) => { t += `${i + 1}. ${s.desc}${s.tool ? ' using ' + s.tool : ''}\n` })
      t += `\nSuccess: ${e.metric}`
    } else {
      t += `PRD: ${e.area.toUpperCase()}\nRank #${rank} | Score ${e.score}/10\n\n`
      t += `Problem: ${e.pain}\nTrigger: ${e.triggerType || ''} ${e.trigger || e.clientTrigger || ''}\n`
      t += `Steps:\n${steps.map((s, i) => `${i + 1}. ${s.desc}${s.tool ? ' [' + s.tool + ']' : ''}`).join('\n')}\n`
      t += `Output: ${e.output || e.clientOutput || ''}\nSuccess: ${e.metric}\n`
    }
    setPrdText(t)
    setShowPRD(true)
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold">Build list — ranked by score</h3>
          <p className="text-xs text-text-muted mt-1">Sorted by weighted score (Impact 40%, Urgency 35%, Feasibility 25%)</p>
        </div>
      </div>

      {!sorted.length ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-[14px] bg-app-surface">
          <p className="text-text-hint font-medium">No opportunities yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-border rounded-[14px] bg-app-surface">
          <table className="w-full text-xs">
            <thead className="bg-[#1c1917] dark:bg-[#0f0f1a]">
              <tr>
                {['#', 'Opportunity', 'Score', 'Status', 'Tool', 'Build', 'Saves', 'AI', 'Metric'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => {
                const sc = getScoreColor(e.score)
                const statusCls = STATUS_COLORS[(e.status || 'pending-review') as OpportunityStatus] || ''
                return (
                  <tr key={e.id} className="border-b border-border/50 last:border-0 hover:bg-app-bg/50 transition-colors">
                    <td className="px-3 py-3 font-bold text-text-hint">{i + 1}</td>
                    <td className="px-3 py-3"><span className="font-bold">{e.area}</span>{e.owner && <span className="block text-[10px] text-text-hint mt-0.5">{e.owner}</span>}</td>
                    <td className="px-3 py-3"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: sc.bg, color: sc.col }}>{e.score}</span></td>
                    <td className="px-3 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCls}`}>{STATUS_LABELS[(e.status || 'pending-review') as OpportunityStatus]}</span></td>
                    <td className="px-3 py-3 text-text-muted">{e.tool}</td>
                    <td className="px-3 py-3 text-text-muted">{e.buildtime || '--'}</td>
                    <td className="px-3 py-3 text-text-muted">{e.timesaved ? `${e.timesaved} h/wk` : '--'}</td>
                    <td className="px-3 py-3">{e.aiType && e.aiType !== 'none' ? <span className="text-ai font-bold">Yes</span> : <span className="text-text-hint">No</span>}</td>
                    <td className="px-3 py-3 text-text-muted max-w-[200px] truncate">{e.metric || '--'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PRD Generator (builder only) */}
      {builderMode && sorted.length > 0 && (
        <div className="mt-6 p-5 bg-app-surface border border-border rounded-[14px]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold">Generate PRD</h4>
            <div className="flex gap-0.5 bg-app-bg rounded-lg p-0.5">
              <button onClick={() => setPrdFormat('md')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${prdFormat === 'md' ? 'bg-app-surface shadow text-text-primary' : 'text-text-muted'}`}>Markdown</button>
              <button onClick={() => setPrdFormat('plain')} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${prdFormat === 'plain' ? 'bg-app-surface shadow text-text-primary' : 'text-text-muted'}`}>Plain</button>
            </div>
          </div>
          <div className="flex gap-2 items-center mb-3">
            <select value={selectedPRD} onChange={ev => { setSelectedPRD(ev.target.value); if (ev.target.value) generatePRD(ev.target.value) }}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-app-bg text-xs">
              <option value="">— Select an opportunity —</option>
              {sorted.map((e, i) => <option key={e.id} value={e.id}>#{i + 1} {e.area} ({e.score}/10)</option>)}
            </select>
          </div>
          {showPRD && (
            <div className="animate-fade-in">
              <pre className="bg-[#1c1917] rounded-xl p-4 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">{prdText}</pre>
              <div className="flex gap-2 mt-2">
                <button onClick={() => { navigator.clipboard.writeText(prdText) }} className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs font-medium hover:bg-app-bg transition-colors">
                  <Copy size={12} /> Copy
                </button>
                <button onClick={() => setShowPRD(false)} className="px-4 py-2 rounded-lg text-xs text-text-muted hover:bg-app-bg transition-colors">Close</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
