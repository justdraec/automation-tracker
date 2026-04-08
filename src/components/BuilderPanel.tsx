import { useState } from 'react'
import { ChevronDown, Plus, X, Rocket, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react'
import type { Opportunity, Dependency } from '@/lib/types'
import { calcScore, getPriority, getScoreColor, getScoreLabel } from '@/lib/scoring'
import { callGeneratePRD } from '@/lib/supabase'

interface Props {
  entry: Opportunity
  onSave: (opp: Opportunity) => void
}

export default function BuilderPanel({ entry, onSave }: Props) {
  const [e, setE] = useState<Opportunity>({ ...entry })
  const [deps, setDeps] = useState<Dependency[]>(entry.dependencies || [])
  const [advOps, setAdvOps] = useState(false)
  const [prdText, setPrdText] = useState('')
  const [prdLoading, setPrdLoading] = useState(false)
  const [showPRD, setShowPRD] = useState(false)

  function update(field: keyof Opportunity, value: string | number | boolean): void {
    setE(prev => ({ ...prev, [field]: value }))
  }

  function addDep(): void { setDeps(prev => [...prev, { id: String(Date.now()), desc: '', status: 'pending', owner: '' }]) }
  function removeDep(id: string): void { setDeps(prev => prev.filter(d => d.id !== id)) }
  function updateDep(id: string, field: keyof Dependency, val: string): void {
    setDeps(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d))
  }

  function save(): void {
    const score = calcScore(e.impact, e.urgency, e.feasibility)
    const priority = getPriority(score)
    const notesText = deps.map(d => `${d.desc} [${d.status}]${d.owner ? ' - ' + d.owner : ''}`).join('; ')
    const errorText = `Notify ${e.errorNotify || 'team'} via ${e.errorChannel}. Retry ${e.errorRetry}x. Fallback: ${e.errorFallback}.`
    const updated: Opportunity = {
      ...e,
      dependencies: deps,
      notes: notesText,
      error: errorText,
      score,
      priority,
      status: e.status === 'pending-review' ? 'not-started' : e.status,
    }
    onSave(updated)
  }

  async function handleGeneratePRD(): Promise<void> {
    setPrdLoading(true)
    try {
      const text = await callGeneratePRD(e, 'md')
      setPrdText(text)
      setShowPRD(true)
    } catch {
      setPrdText('Failed to generate PRD. Please check that the Anthropic API key is configured in Supabase secrets.')
      setShowPRD(true)
    }
    setPrdLoading(false)
  }

  const score = calcScore(e.impact, e.urgency, e.feasibility)
  const sc = getScoreColor(score)
  const sl = getScoreLabel(score)
  const deg = Math.round(score / 10 * 360)

  // Completeness checks
  const checks = [
    { label: 'Trigger defined', ok: !!e.clientTrigger },
    { label: 'Input data captured', ok: !!e.clientInput },
    { label: 'Steps documented', ok: !!e.clientSteps },
    { label: 'Output defined', ok: !!e.clientOutput },
    { label: 'Success metric set', ok: !!e.metric },
    { label: 'Time saved estimated', ok: !!e.timesaved },
    { label: 'Build tool selected', ok: !!e.tool && e.tool !== 'TBD' },
  ]
  const complete = checks.filter(c => c.ok).length
  const allGood = complete === checks.length

  return (
    <div className="mt-4 p-5 bg-step2-bg border-2 border-step2-border rounded-[14px] animate-fade-in">
      <h4 className="text-sm font-bold text-step2-text uppercase tracking-wider mb-4">Builder Validation</h4>

      {/* Completeness indicator */}
      <div className={`p-3 rounded-xl border mb-4 ${allGood ? 'bg-step3-bg border-step3-border' : 'bg-step1-bg border-step1-border'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${allGood ? 'text-step3-text' : 'text-step1-text'}`}>
            {allGood ? 'Ready to build' : `${complete} of ${checks.length} complete`}
          </span>
          <div className="flex gap-1">
            {checks.map((c, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${c.ok ? 'bg-emerald-400' : 'bg-amber-300'}`} title={c.label} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px]">
              {c.ok
                ? <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />
                : <AlertCircle size={11} className="text-amber-500 flex-shrink-0" />
              }
              <span className={c.ok ? 'text-text-muted' : 'text-step1-text'}>{c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Discovery summary (read-only) */}
      <div className="p-3 bg-step1-bg border border-step1-border rounded-xl mb-4 text-xs">
        <p className="font-bold text-step1-text text-[10px] uppercase mb-2">Captured from client</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-bold text-text-hint text-[10px] uppercase">Trigger</span>
            <p className="text-text-primary mt-0.5">{e.clientTrigger || '—'}</p>
          </div>
          <div>
            <span className="font-bold text-text-hint text-[10px] uppercase">Input data</span>
            <p className="text-text-primary mt-0.5">{e.clientInput || '—'}</p>
          </div>
          <div className="col-span-2">
            <span className="font-bold text-text-hint text-[10px] uppercase">Steps</span>
            <p className="text-text-primary mt-0.5 whitespace-pre-line">{e.clientSteps || '—'}</p>
          </div>
          <div>
            <span className="font-bold text-text-hint text-[10px] uppercase">Output</span>
            <p className="text-text-primary mt-0.5">{e.clientOutput || '—'}</p>
          </div>
          <div>
            <span className="font-bold text-text-hint text-[10px] uppercase">Desired state</span>
            <p className="text-text-primary mt-0.5">{e.desired || '—'}</p>
          </div>
        </div>
      </div>

      {/* Score (from discovery, read-only) */}
      <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-app-surface mb-4" style={{ borderColor: sc.col + '40' }}>
        <div className="score-donut w-14 h-14 text-lg font-bold flex-shrink-0"
             style={{ background: `conic-gradient(${sc.col} ${deg}deg, var(--border-color) ${deg}deg)` }}>
          <span className="bg-app-surface w-10 h-10 rounded-full flex items-center justify-center" style={{ color: sc.col }}>
            {score}
          </span>
        </div>
        <div>
          <p className="font-bold text-sm">{sl.label}</p>
          <p className="text-xs text-text-muted mt-0.5">
            Impact {e.impact}/5 · Urgency {e.urgency}/5 · Feasibility {e.feasibility}/5
          </p>
          <p className="text-[10px] text-text-hint mt-0.5 italic">Scored during discovery</p>
        </div>
      </div>

      {/* Technical setup */}
      <h4 className="text-sm font-bold text-step2-text uppercase tracking-wider mb-3">Technical setup</h4>
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Trigger type">
            <select value={e.triggerType} onChange={ev => update('triggerType', ev.target.value)} className="field-input">
              <option value="">Select...</option>
              <option value="webhook">Webhook</option>
              <option value="schedule">Schedule</option>
              <option value="form">Form submission</option>
              <option value="new-record">New record</option>
              <option value="email">Email received</option>
              <option value="manual">Manual trigger</option>
              <option value="api-event">API event</option>
              <option value="file-upload">File upload</option>
            </select>
          </Field>
          <Field label="Trigger config">
            <textarea value={e.trigger} onChange={ev => update('trigger', ev.target.value)} className="field-input h-16" placeholder="Cron expression, webhook URL, etc." />
          </Field>
        </div>

        {/* Build tool — button grid */}
        <Field label="Build tool">
          <div className="grid grid-cols-3 gap-2">
            {['n8n', 'Make.com', 'Zapier', 'Custom Script', 'Power Automate', 'Retool', 'TBD'].map(t => (
              <button
                key={t}
                onClick={() => update('tool', t)}
                className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all text-left
                  ${e.tool === t
                    ? 'bg-step2-bg border-step2-border text-step2-text'
                    : 'border-border text-text-muted hover:bg-app-bg'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Estimated build time">
            <select value={e.buildtime} onChange={ev => update('buildtime', ev.target.value)} className="field-input">
              <option value="">Select...</option>
              {['Less than 1 day', '1-2 days', '3-5 days', '1-2 weeks', 'More than 2 weeks'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <input value={e.category} onChange={ev => update('category', ev.target.value)} className="field-input" placeholder="e.g. Finance, Sales, Ops" />
          </Field>
        </div>
      </div>

      {/* Error handling */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Field label="Notify on error">
          <input value={e.errorNotify} onChange={ev => update('errorNotify', ev.target.value)} className="field-input" placeholder="e.g. Sarah" />
        </Field>
        <Field label="Channel">
          <select value={e.errorChannel} onChange={ev => update('errorChannel', ev.target.value)} className="field-input">
            <option value="slack">Slack</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="none">None</option>
          </select>
        </Field>
        <Field label="Retries">
          <select value={e.errorRetry} onChange={ev => update('errorRetry', ev.target.value)} className="field-input">
            <option value="0">None</option>
            <option value="1">1x</option>
            <option value="3">3x</option>
            <option value="5">5x</option>
          </select>
        </Field>
      </div>

      {/* AI involvement */}
      <div className="p-3 bg-ai-bg border border-ai-border rounded-xl mb-4">
        <p className="text-[10px] font-bold text-ai uppercase mb-2">AI involvement</p>
        <select value={e.aiType} onChange={ev => update('aiType', ev.target.value)} className="field-input mb-2">
          <option value="none">No AI needed</option>
          <option value="content">Content generation</option>
          <option value="data">Data processing / extraction</option>
          <option value="decision">Decision making</option>
          <option value="multi">Multiple AI tasks</option>
        </select>
        {e.aiType !== 'none' && (
          <div className="grid grid-cols-2 gap-2">
            <select value={e.aiModel} onChange={ev => update('aiModel', ev.target.value)} className="field-input">
              <option value="">Select model...</option>
              {['Claude (Anthropic)', 'OpenAI GPT', 'Google Gemini', 'Meta Llama', 'Mistral', 'Local LLM', 'TBD'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input value={e.aiTask} onChange={ev => update('aiTask', ev.target.value)} className="field-input" placeholder="What will AI do?" />
          </div>
        )}
      </div>

      {/* Dependencies */}
      <Field label="Dependencies">
        <div className="space-y-1.5 mb-1">
          {deps.map(d => (
            <div key={d.id} className="grid grid-cols-[1fr_80px_80px_24px] gap-1.5 items-center">
              <input value={d.desc} onChange={ev => updateDep(d.id, 'desc', ev.target.value)} className="field-input-sm" placeholder="What's needed?" />
              <select value={d.status} onChange={ev => updateDep(d.id, 'status', ev.target.value)} className="field-input-sm">
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="blocked">Blocked</option>
              </select>
              <input value={d.owner} onChange={ev => updateDep(d.id, 'owner', ev.target.value)} className="field-input-sm" placeholder="Owner" />
              <button onClick={() => removeDep(d.id)} className="text-text-hint hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
          <button onClick={addDep} className="text-xs text-text-muted hover:text-step2-text transition-colors flex items-center gap-1">
            <Plus size={12} /> Add dependency
          </button>
        </div>
      </Field>

      {/* Advanced ops (collapsible) */}
      <button onClick={() => setAdvOps(!advOps)} className="flex items-center justify-between w-full p-2.5 bg-app-bg border border-border rounded-lg text-xs font-semibold text-text-muted mt-3 mb-3">
        <span>Testing, rollback & approval</span>
        <ChevronDown size={12} className={`transition-transform ${advOps ? 'rotate-180' : ''}`} />
      </button>
      {advOps && (
        <div className="mb-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Testing strategy">
              <select value={e.testing} onChange={ev => update('testing', ev.target.value)} className="field-input">
                <option value="manual">Manual test</option>
                <option value="parallel">Parallel run</option>
                <option value="staged">Staged rollout</option>
                <option value="direct">Direct deploy</option>
              </select>
            </Field>
            <Field label="Rollback plan">
              <input value={e.rollback} onChange={ev => update('rollback', ev.target.value)} className="field-input" placeholder="If it breaks..." />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maintainer">
              <input value={e.maintainer} onChange={ev => update('maintainer', ev.target.value)} className="field-input" placeholder="Who monitors?" />
            </Field>
            <Field label="Review date">
              <input type="date" value={e.reviewDate} onChange={ev => update('reviewDate', ev.target.value)} className="field-input" />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="approval" checked={e.approval} onChange={ev => update('approval', ev.target.checked)} className="w-4 h-4" />
            <label htmlFor="approval" className="text-xs text-text-muted">Requires approval before deploying</label>
            {e.approval && (
              <input value={e.approver} onChange={ev => update('approver', ev.target.value)} className="field-input-sm ml-2" placeholder="Approver name" />
            )}
          </div>
        </div>
      )}

      {/* Validator notes */}
      <Field label="Validator notes">
        <textarea
          value={e.notes}
          onChange={ev => update('notes', ev.target.value)}
          className="field-input h-20"
          placeholder="Any gaps, assumptions, or things to clarify before building..."
        />
      </Field>

      {/* Generated PRD output */}
      {showPRD && (
        <div className="mt-4 animate-fade-in">
          <div className="bg-app-surface border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-text-muted">Generated PRD</span>
              <div className="flex gap-1.5">
                <button onClick={() => navigator.clipboard.writeText(prdText)} className="text-[11px] text-accent hover:underline flex items-center gap-1">
                  <Copy size={11} /> Copy
                </button>
                <button onClick={() => setShowPRD(false)} className="text-[11px] text-text-hint hover:text-text-muted">Close</button>
              </div>
            </div>
            <pre className="p-4 text-xs text-text-muted font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto bg-app-bg">{prdText}</pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-step2-border mt-4">
        <button onClick={save} className="px-5 py-2 rounded-lg bg-step2 text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Save validation
        </button>
        <button
          onClick={handleGeneratePRD}
          disabled={(!e.tool || e.tool === 'TBD') || prdLoading}
          className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={!e.tool || e.tool === 'TBD' ? 'Select a build tool first' : 'Generate full PRD with AI'}
        >
          {prdLoading ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
          {prdLoading ? 'Generating...' : 'Generate PRD'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">{label}</label>
      {children}
    </div>
  )
}
