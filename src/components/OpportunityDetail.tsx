import { useState } from 'react'
import { FileText, Wrench, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { getScoreColor } from '@/lib/scoring'
import { generateMarkdownPRD, generatePlainPRD } from '@/lib/prd-generator'
import BuilderPanel from '@/components/BuilderPanel'

interface Props {
  entry: Opportunity
  builderMode: boolean
  onUpdate: (opp: Opportunity) => void
  onDelete: (id: number) => void
  onStatusChange: (id: number, status: OpportunityStatus) => void
}

export default function OpportunityDetail({ entry: e, builderMode, onUpdate, onDelete, onStatusChange }: Props) {
  const [showBuilder, setShowBuilder] = useState(false)
  const [showPRD, setShowPRD] = useState(false)
  const [prdText, setPrdText] = useState('')
  const [showDiscovery, setShowDiscovery] = useState(false)

  const sc = getScoreColor(e.score)
  const statusCls = STATUS_COLORS[(e.status || 'pending-review') as OpportunityStatus] || ''

  function handleGeneratePRD() {
    const sorted = [e]
    const text = generateMarkdownPRD(e, 1)
    setPrdText(text)
    setShowPRD(!showPRD)
  }

  function scorePillCls(score: number) {
    if (score >= 7.5) return 'bg-[var(--score-high-bg)] text-[var(--score-high-text)]'
    if (score >= 5) return 'bg-[var(--score-mid-bg)] text-[var(--score-mid-text)]'
    return 'bg-[var(--score-low-bg)] text-[var(--score-low-text)]'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="bg-[var(--surface)] border-b border-[var(--border-color)] px-5 py-3.5 flex items-center gap-3 flex-shrink-0">
        <h2 className="text-sm font-medium text-[var(--text-primary)] flex-1 truncate">{e.area || 'Untitled'}</h2>
        {builderMode && (
          <select
            value={e.status || 'pending-review'}
            onChange={ev => onStatusChange(e.id, ev.target.value as OpportunityStatus)}
            className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold cursor-pointer ${statusCls}`}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}
        {!builderMode && (
          <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${statusCls}`}>
            {STATUS_LABELS[(e.status || 'pending-review') as OpportunityStatus]}
          </span>
        )}
        {e.score > 0 && (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${scorePillCls(e.score)}`}>{e.score}</span>
        )}
        <div className="flex items-center gap-1 ml-1">
          <IconBtn title="Generate PRD" onClick={handleGeneratePRD}>
            <FileText size={14} />
          </IconBtn>
          {builderMode && (
            <IconBtn title={showBuilder ? 'Close builder' : 'Open builder'} onClick={() => setShowBuilder(!showBuilder)} active={showBuilder}>
              <Wrench size={14} />
            </IconBtn>
          )}
          {builderMode && (
            <IconBtn title="Delete" onClick={() => { if (confirm('Delete "' + e.area + '"?')) onDelete(e.id) }} danger>
              <Trash2 size={14} />
            </IconBtn>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* PRD output */}
        {showPRD && (
          <div className="m-4 animate-fade-in">
            <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-muted)]">Generated PRD</span>
                <div className="flex gap-1.5">
                  <button onClick={() => navigator.clipboard.writeText(prdText)} className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1">
                    <Copy size={11} /> Copy
                  </button>
                  <button onClick={() => setShowPRD(false)} className="text-[11px] text-[var(--text-hint)] hover:text-[var(--text-muted)]">Close</button>
                </div>
              </div>
              <pre className="p-4 text-xs text-[var(--text-muted)] font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-[var(--app-bg)]">{prdText}</pre>
            </div>
          </div>
        )}

        {/* Discovery summary */}
        <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 m-4">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-hint)] mb-1">Pain point</p>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{e.pain || 'Not provided'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <DetailCell label="Owner" value={e.owner} />
            <DetailCell label="Frequency" value={e.frequency} />
            <DetailCell label="Tools" value={e.tools} />
            <DetailCell label="Time saved" value={e.timesaved ? `${e.timesaved} hrs/week` : undefined} />
          </div>

          {e.metric && (
            <div className="bg-[var(--step3-bg)] border border-[var(--step3-border)] rounded-xl p-3.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--step3-text)] mb-1">Success metric</p>
              <p className="text-sm text-[var(--step3-text)]">{e.metric}</p>
            </div>
          )}
        </div>

        {/* Client discovery details (collapsible) */}
        {(e.clientTrigger || e.clientSteps || e.clientInput || e.clientOutput) && (
          <div className="mx-4 mb-4">
            <button
              onClick={() => setShowDiscovery(!showDiscovery)}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-2"
            >
              {showDiscovery ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Client discovery details
            </button>
            {showDiscovery && (
              <div className="bg-[var(--step1-bg)] border border-[var(--step1-border)] rounded-xl p-4 animate-fade-in">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-semibold text-[var(--step1-text)] text-[10px] uppercase mb-1">What triggers it</p>
                    <p className="text-[var(--text-primary)]">{e.clientTrigger || '--'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--step1-text)] text-[10px] uppercase mb-1">Input data</p>
                    <p className="text-[var(--text-primary)]">{e.clientInput || '--'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--step1-text)] text-[10px] uppercase mb-1">Steps described</p>
                    <p className="text-[var(--text-primary)] whitespace-pre-line">{e.clientSteps || '--'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--step1-text)] text-[10px] uppercase mb-1">Expected output</p>
                    <p className="text-[var(--text-primary)]">{e.clientOutput || '--'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Desired state */}
        {e.desired && (
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 mx-4 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-hint)] mb-1">Ideal automated state</p>
            <p className="text-sm text-[var(--text-primary)] leading-relaxed">{e.desired}</p>
          </div>
        )}

        {/* Tech spec summary (if filled) */}
        {(e.trigger || e.steps) && (
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 mx-4 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Technical specification</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <DetailCell label="Trigger type" value={e.triggerType} />
              <DetailCell label="Build tool" value={e.tool} />
              <DetailCell label="Build time" value={e.buildtime} />
              <DetailCell label="Error handling" value={e.error} />
            </div>
            {e.steps && (
              <div className="mt-3">
                <p className="font-semibold text-[var(--text-hint)] text-[10px] uppercase mb-1">Process steps</p>
                <p className="text-xs text-[var(--text-primary)] whitespace-pre-line">{e.steps}</p>
              </div>
            )}
          </div>
        )}

        {/* Scoring */}
        {e.score > 0 && (
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 mx-4 mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-hint)] mb-3">Scoring</p>
            <div className="flex items-center gap-4">
              <div className="score-donut w-12 h-12 text-sm font-bold flex-shrink-0"
                   style={{ background: `conic-gradient(${sc.col} 0deg, ${sc.col} ${Math.round(e.score / 10 * 360)}deg, var(--border-color) ${Math.round(e.score / 10 * 360)}deg)` }}>
                <span className="bg-[var(--surface)] w-8 h-8 rounded-full flex items-center justify-center" style={{ color: sc.col }}>{e.score}</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div><span className="text-[var(--text-hint)] text-[10px] uppercase">Impact</span><p className="font-semibold">{e.impact}/5</p></div>
                <div><span className="text-[var(--text-hint)] text-[10px] uppercase">Urgency</span><p className="font-semibold">{e.urgency}/5</p></div>
                <div><span className="text-[var(--text-hint)] text-[10px] uppercase">Feasibility</span><p className="font-semibold">{e.feasibility}/5</p></div>
              </div>
            </div>
          </div>
        )}

        {/* Builder Panel */}
        {showBuilder && builderMode && (
          <div className="mx-4 mb-4">
            <BuilderPanel entry={e} onSave={onUpdate} />
          </div>
        )}
      </div>
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-hint)] mb-0.5">{label}</p>
      <p className="text-sm text-[var(--text-primary)]">{value || '--'}</p>
    </div>
  )
}

function IconBtn({ children, onClick, title, active, danger }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all
        ${active
          ? 'bg-accent/10 border-accent/30 text-accent'
          : danger
            ? 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-hint)] hover:text-red-500 hover:border-red-300 hover:bg-red-50'
            : 'border-[var(--border-color)] bg-[var(--surface)] text-[var(--text-hint)] hover:text-[var(--text-muted)] hover:bg-[var(--app-bg)]'
        }`}
    >
      {children}
    </button>
  )
}
