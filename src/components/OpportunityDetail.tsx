import { useState } from 'react'
import Icon from '@/components/Icon'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import { getScoreColor } from '@/lib/scoring'
import { generateMarkdownPRD } from '@/lib/prd-generator'
import BuilderPanel from '@/components/BuilderPanel'

interface Props {
  entry: Opportunity
  builderMode: boolean
  onUpdate: (opp: Opportunity) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: OpportunityStatus) => void
}

const STATUS_STYLES: Record<OpportunityStatus, string> = {
  'pending-review': 'bg-surface-container-high text-on-surface-variant',
  'not-started': 'bg-surface-container-high text-on-surface-variant',
  'in-progress': 'bg-tertiary-fixed text-tertiary',
  'built': 'bg-green-100 text-[#008545]',
  'on-hold': 'bg-error-container text-error',
}

export default function OpportunityDetail({ entry: e, builderMode, onUpdate, onDelete, onStatusChange }: Props) {
  const [showBuilder, setShowBuilder] = useState(false)
  const [showPRD, setShowPRD] = useState(false)
  const [prdText, setPrdText] = useState('')

  const sc = getScoreColor(e.score)
  const status = (e.status || 'pending-review') as OpportunityStatus

  function handleGeneratePRD(): void {
    setPrdText(generateMarkdownPRD(e, 1))
    setShowPRD(!showPRD)
  }

  // Parse steps into array for the grid
  const stepsArr = (e.clientSteps || e.steps || '').split('\n').filter(Boolean)

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="bg-surface border-b border-outline-variant/10 px-8 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant flex-1">
          <span>Build List</span>
          <Icon name="chevron_right" size={16} className="text-outline-variant" />
          <span className="font-headline font-bold text-on-surface truncate">{e.area || 'Untitled'}</span>
        </div>
        <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        {e.score > 0 && (
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${e.score >= 7.5 ? 'bg-tertiary-fixed text-tertiary' : e.score >= 5 ? 'bg-primary-fixed text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
            {e.score} SCORE
          </span>
        )}
        {builderMode && (
          <select value={status} onChange={ev => onStatusChange(e.id, ev.target.value as OpportunityStatus)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-outline-variant bg-white font-medium cursor-pointer outline-none ml-2">
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2 ml-2">
          <button onClick={handleGeneratePRD} className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-all" title="Generate PRD">
            <Icon name="description" size={18} />
          </button>
          {builderMode && (
            <button onClick={() => setShowBuilder(!showBuilder)} className={`p-2 rounded-xl transition-all ${showBuilder ? 'bg-primary-container text-on-primary' : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'}`} title="Builder panel">
              <Icon name="build" size={18} />
            </button>
          )}
          {builderMode && (
            <button onClick={() => { if (confirm('Delete "' + e.area + '"?')) onDelete(e.id) }}
              className="p-2 rounded-xl bg-surface-container-low hover:bg-error-container hover:text-error text-on-surface-variant transition-all" title="Delete">
              <Icon name="delete" size={18} />
            </button>
          )}
          <button className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
            Publish Flow
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-8 py-6">
          {/* PRD output */}
          {showPRD && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-outline-variant/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface-variant">Generated PRD</span>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(prdText)} className="text-[11px] text-primary hover:underline flex items-center gap-1"><Icon name="content_copy" size={14} /> Copy</button>
                    <button onClick={() => setShowPRD(false)} className="text-[11px] text-on-surface-variant/50 hover:text-on-surface-variant">Close</button>
                  </div>
                </div>
                <pre className="p-4 text-xs text-on-surface-variant font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-surface-container-low">{prdText}</pre>
              </div>
            </div>
          )}

          {/* Bento grid: Problem (8) + Metric (4) */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Problem Statement */}
            <div className="col-span-8 bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-3">Problem Statement</p>
              <p className="text-on-surface text-[15px] leading-relaxed mb-6">{e.pain || 'Not provided'}</p>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">Owner</p>
                  <p className="text-sm font-medium text-on-surface">{e.owner || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">Frequency</p>
                  <p className="text-sm font-medium text-on-surface">{e.frequency || '--'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">Tools</p>
                  <div className="flex gap-1 flex-wrap">
                    {e.toolChips?.length ? e.toolChips.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-surface-container-low rounded text-[11px] font-medium text-on-surface">{t}</span>
                    )) : <span className="text-sm text-on-surface">{e.tools || '--'}</span>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">Est. Time</p>
                  <p className="text-sm font-bold text-primary">{e.timesaved ? `${e.timesaved}h/week` : '--'}</p>
                </div>
              </div>
            </div>

            {/* Success Metric — green card */}
            <div className="col-span-4 bg-[#008545] rounded-2xl p-6 text-white flex flex-col justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-3">Target Success Metric</p>
              <p className="text-lg font-bold leading-relaxed">{e.metric || 'No metric defined'}</p>
            </div>
          </div>

          {/* Discovery Details — amber bento */}
          {(e.clientTrigger || e.clientSteps || e.clientInput || e.clientOutput) && (
            <div className="bg-[#fef3c7] rounded-2xl p-6 mb-4 border border-amber-200">
              <div className="grid grid-cols-12 gap-6">
                {/* Left: Trigger + Input */}
                <div className="col-span-5 space-y-5">
                  {e.clientTrigger && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon name="mail" size={16} className="text-amber-700" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">The Trigger</p>
                      </div>
                      <p className="text-sm text-amber-900">{e.clientTrigger}</p>
                    </div>
                  )}
                  {e.clientInput && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-2">Input Data</p>
                      <ul className="space-y-1">
                        {e.clientInput.split(',').map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm text-amber-900">
                            <Icon name="check" size={14} className="text-amber-700" /> {item.trim()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Right: Automated Steps */}
                <div className="col-span-7">
                  {stepsArr.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-800 mb-3">Automated Steps</p>
                      <div className="grid grid-cols-2 gap-2">
                        {stepsArr.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 bg-white/60 rounded-xl p-3">
                            <span className="text-xs font-bold text-amber-700 mt-0.5">{i + 1}.</span>
                            <p className="text-xs text-amber-900">{step.replace(/^\d+\.\s*/, '')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {e.clientOutput && (
                    <div className="mt-4 flex items-center gap-3">
                      <span className="px-3 py-1 bg-amber-200 rounded-full text-[10px] font-bold text-amber-800 uppercase">Output</span>
                      <p className="text-xs text-amber-900">{e.clientOutput}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scoring */}
          {e.score > 0 && (
            <div className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/10 mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/50 mb-3">Scoring</p>
              <div className="flex items-center gap-6">
                <div className="score-donut w-14 h-14 text-lg font-bold flex-shrink-0"
                     style={{ background: `conic-gradient(${sc.col} ${Math.round(e.score / 10 * 360)}deg, #ccc3d8 ${Math.round(e.score / 10 * 360)}deg)` }}>
                  <span className="bg-surface-container-lowest w-10 h-10 rounded-full flex items-center justify-center" style={{ color: sc.col }}>{e.score}</span>
                </div>
                <div className="flex gap-6 text-xs">
                  <div><span className="text-on-surface-variant text-[10px] uppercase font-bold">Impact</span><p className="font-bold text-on-surface text-sm">{e.impact}/5</p></div>
                  <div><span className="text-on-surface-variant text-[10px] uppercase font-bold">Urgency</span><p className="font-bold text-on-surface text-sm">{e.urgency}/5</p></div>
                  <div><span className="text-on-surface-variant text-[10px] uppercase font-bold">Feasibility</span><p className="font-bold text-on-surface text-sm">{e.feasibility}/5</p></div>
                </div>
              </div>
            </div>
          )}

          {/* Builder Panel */}
          {showBuilder && builderMode && (
            <div className="mb-4">
              <BuilderPanel entry={e} onSave={onUpdate} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
