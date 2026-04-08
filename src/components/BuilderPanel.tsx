import { useState } from 'react'
import type { Opportunity, Dependency } from '@/lib/types'
import { calcScore, getPriority, getScoreColor, getScoreLabel } from '@/lib/scoring'
import { callGeneratePRD } from '@/lib/supabase'
import Icon from '@/components/Icon'

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

  const hasDeployConfig = !!(localStorage.getItem('yp-n8n-url') || localStorage.getItem('yp-make-token'))

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

  const checks = [
    { label: 'Input Definition', ok: !!e.clientInput },
    { label: 'Workflow Steps', ok: !!e.clientSteps },
    { label: 'Trigger Type', ok: !!e.triggerType },
    { label: 'Output Destination', ok: !!e.clientOutput || !!e.output },
    { label: 'Success Metric', ok: !!e.metric },
    { label: 'Build Tool Selection', ok: !!e.tool && e.tool !== 'TBD' },
    { label: 'Time Saved Est.', ok: !!e.timesaved },
  ]
  const complete = checks.filter(c => c.ok).length
  const allGood = complete === checks.length

  return (
    <div className="mt-4 p-6 bg-[#eef2ff] border-2 border-secondary-fixed-dim rounded-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon name="build" size={20} className="text-secondary" />
          <h4 className="text-sm font-headline font-bold text-on-surface">Builder Validation Panel</h4>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary bg-secondary-fixed px-2.5 py-1 rounded-full">Drafting Mode</span>
      </div>

      {/* Two-column: Score + Checklist | Form */}
      <div className="grid grid-cols-12 gap-4 mb-5">
        {/* Left: Score + Completeness */}
        <div className="col-span-4 space-y-4">
          {/* Score card */}
          <div className="bg-white rounded-2xl p-4 border border-outline-variant/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-3">Discovery Score</p>
            <div className="flex items-center gap-3">
              <div className="score-donut w-16 h-16 text-xl font-bold flex-shrink-0"
                   style={{ background: `conic-gradient(${sc.col} ${deg}deg, #ccc3d8 ${deg}deg)` }}>
                <span className="bg-white w-11 h-11 rounded-full flex items-center justify-center" style={{ color: sc.col }}>{score}</span>
              </div>
              <div>
                <p className="font-headline font-bold text-sm">{sl.label}</p>
                <p className="text-[11px] text-on-surface-variant mt-0.5">I{e.impact} · U{e.urgency} · F{e.feasibility}</p>
              </div>
            </div>
          </div>

          {/* Completeness checklist */}
          <div className="bg-white rounded-2xl p-4 border border-outline-variant/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Completeness</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${allGood ? 'bg-green-100 text-[#008545]' : 'bg-tertiary-fixed text-tertiary'}`}>
                {complete}/{checks.length}
              </span>
            </div>
            <div className="space-y-2">
              {checks.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  {c.ok
                    ? <Icon name="check_circle" size={16} className="text-[#008545]" filled />
                    : <div className="w-4 h-4 rounded-full border-2 border-primary/30 flex-shrink-0" />
                  }
                  <span className={`text-xs ${c.ok ? 'text-on-surface-variant' : 'text-on-surface-variant/50'}`}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="col-span-8 space-y-4">
          {/* Trigger */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trigger Type">
              <div className="relative">
                <select value={e.triggerType} onChange={ev => update('triggerType', ev.target.value)} className="field-input appearance-none pr-10">
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
                <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </Field>
            <Field label="Trigger Details">
              <textarea value={e.trigger} onChange={ev => update('trigger', ev.target.value)} className="field-input h-[76px]" placeholder="Cron expression, webhook URL, etc." />
            </Field>
          </div>

          {/* AI involvement */}
          <div className="bg-primary-fixed border border-primary-fixed-dim rounded-xl p-4">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">AI Involvement</p>
            <div className="relative">
              <select value={e.aiType} onChange={ev => update('aiType', ev.target.value)} className="field-input appearance-none pr-10 mb-2">
                <option value="none">No AI needed</option>
                <option value="content">Content generation</option>
                <option value="data">Data processing / extraction</option>
                <option value="decision">Decision making</option>
                <option value="multi">Multiple AI tasks</option>
              </select>
              <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40 pointer-events-none" />
            </div>
            {e.aiType !== 'none' && (
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <select value={e.aiModel} onChange={ev => update('aiModel', ev.target.value)} className="field-input appearance-none pr-10">
                    <option value="">Select model...</option>
                    {['Claude (Anthropic)', 'OpenAI GPT', 'Google Gemini', 'Meta Llama', 'Mistral', 'Local LLM', 'TBD'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
                </div>
                <input value={e.aiTask} onChange={ev => update('aiTask', ev.target.value)} className="field-input" placeholder="What will AI do?" />
              </div>
            )}
          </div>

          {/* Build tool */}
          <Field label="Build Tool">
            <div className="grid grid-cols-4 gap-2">
              {['n8n', 'Make.com', 'Zapier', 'Custom Script', 'Power Automate', 'Retool', 'TBD'].map(t => (
                <button key={t} onClick={() => update('tool', t)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all text-left
                    ${e.tool === t ? 'bg-primary-fixed border-primary-fixed-dim text-primary font-bold' : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low'}`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>

          {/* Build time + Category */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimated Build Time">
              <div className="relative">
                <select value={e.buildtime} onChange={ev => update('buildtime', ev.target.value)} className="field-input appearance-none pr-10">
                  <option value="">Select...</option>
                  {['Less than 1 day', '1-2 days', '3-5 days', '1-2 weeks', 'More than 2 weeks'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </Field>
            <Field label="Category">
              <input value={e.category} onChange={ev => update('category', ev.target.value)} className="field-input" placeholder="e.g. Finance, Sales, Ops" />
            </Field>
          </div>

          {/* Error handling */}
          <div className="grid grid-cols-3 gap-3">
            <Field label="Notify on Error">
              <input value={e.errorNotify} onChange={ev => update('errorNotify', ev.target.value)} className="field-input" placeholder="e.g. Sarah" />
            </Field>
            <Field label="Channel">
              <div className="relative">
                <select value={e.errorChannel} onChange={ev => update('errorChannel', ev.target.value)} className="field-input appearance-none pr-10">
                  <option value="slack">Slack</option><option value="email">Email</option><option value="sms">SMS</option><option value="none">None</option>
                </select>
                <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </Field>
            <Field label="Retries">
              <div className="relative">
                <select value={e.errorRetry} onChange={ev => update('errorRetry', ev.target.value)} className="field-input appearance-none pr-10">
                  <option value="0">None</option><option value="1">1x</option><option value="3">3x</option><option value="5">5x</option>
                </select>
                <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* Dependencies */}
      <Field label="Dependencies">
        <div className="space-y-1.5 mb-1">
          {deps.map(d => (
            <div key={d.id} className="grid grid-cols-[1fr_90px_90px_28px] gap-1.5 items-center">
              <input value={d.desc} onChange={ev => updateDep(d.id, 'desc', ev.target.value)} className="field-input-sm" placeholder="What's needed?" />
              <select value={d.status} onChange={ev => updateDep(d.id, 'status', ev.target.value)} className="field-input-sm">
                <option value="pending">Pending</option><option value="resolved">Resolved</option><option value="blocked">Blocked</option>
              </select>
              <input value={d.owner} onChange={ev => updateDep(d.id, 'owner', ev.target.value)} className="field-input-sm" placeholder="Owner" />
              <button onClick={() => removeDep(d.id)} className="text-on-surface-variant/40 hover:text-error transition-colors"><Icon name="close" size={18} /></button>
            </div>
          ))}
          <button onClick={addDep} className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-medium">
            <Icon name="add" size={16} /> Add dependency
          </button>
        </div>
      </Field>

      {/* Advanced ops */}
      <button onClick={() => setAdvOps(!advOps)} className="flex items-center justify-between w-full p-3 bg-white border border-outline-variant/20 rounded-xl text-xs font-semibold text-on-surface-variant mt-3 mb-3 hover:bg-surface-container-low transition-colors">
        <span>Testing, rollback & approval</span>
        <Icon name={advOps ? 'expand_less' : 'expand_more'} size={18} />
      </button>
      {advOps && (
        <div className="mb-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Testing Strategy">
              <div className="relative">
                <select value={e.testing} onChange={ev => update('testing', ev.target.value)} className="field-input appearance-none pr-10">
                  <option value="manual">Manual test</option><option value="parallel">Parallel run</option><option value="staged">Staged rollout</option><option value="direct">Direct deploy</option>
                </select>
                <Icon name="unfold_more" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none" />
              </div>
            </Field>
            <Field label="Rollback Plan"><input value={e.rollback} onChange={ev => update('rollback', ev.target.value)} className="field-input" placeholder="If it breaks..." /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maintainer"><input value={e.maintainer} onChange={ev => update('maintainer', ev.target.value)} className="field-input" placeholder="Who monitors?" /></Field>
            <Field label="Review Date"><input type="date" value={e.reviewDate} onChange={ev => update('reviewDate', ev.target.value)} className="field-input" /></Field>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="approval" checked={e.approval} onChange={ev => update('approval', ev.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="approval" className="text-xs text-on-surface-variant">Requires approval before deploying</label>
            {e.approval && <input value={e.approver} onChange={ev => update('approver', ev.target.value)} className="field-input-sm ml-2 max-w-[150px]" placeholder="Approver" />}
          </div>
        </div>
      )}

      {/* Validator notes */}
      <Field label="Validator Notes">
        <textarea value={e.notes} onChange={ev => update('notes', ev.target.value)} className="field-input h-20" placeholder="Any gaps, assumptions, or things to clarify..." />
      </Field>

      {/* Discovery context card */}
      <div className="mt-5 bg-tertiary-fixed rounded-2xl p-6 border-t-2 border-tertiary">
        <div className="flex items-start gap-4">
          <div className="bg-tertiary-container p-2.5 rounded-xl text-on-tertiary-container flex-shrink-0">
            <Icon name="lightbulb" size={24} />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-headline font-bold text-on-surface mb-1">Discovery Context{e.category ? `: ${e.category}` : ''}</h4>
            <p className="text-xs text-on-tertiary-fixed-variant leading-relaxed">{e.pain || 'No pain point captured yet.'}</p>
          </div>
          <div className="bg-white/40 backdrop-blur p-3 rounded-xl border border-tertiary/20 flex-shrink-0">
            <p className="text-[9px] font-bold uppercase tracking-tighter text-on-tertiary-fixed-variant mb-0.5">Last Discovery</p>
            <p className="text-xs font-bold text-on-surface">{e.timestamp || '--'}</p>
          </div>
        </div>
      </div>

      {/* PRD output */}
      {showPRD && (
        <div className="mt-4 animate-fade-in">
          <div className="bg-white border border-outline-variant/20 rounded-2xl overflow-hidden">
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

      {/* Actions */}
      <div className="flex gap-3 pt-5 border-t border-secondary-fixed-dim mt-5">
        <button onClick={save} className="px-6 py-2.5 rounded-full border border-outline-variant text-on-surface font-semibold text-sm hover:bg-surface-container-low transition-colors">
          Save Validation
        </button>
        <button
          onClick={handleGeneratePRD}
          disabled={(!e.tool || e.tool === 'TBD') || prdLoading}
          className="px-6 py-2.5 rounded-full bg-primary text-on-primary font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          title={!e.tool || e.tool === 'TBD' ? 'Select a build tool first' : 'Generate PRD with AI'}
        >
          {prdLoading ? <Icon name="progress_activity" size={16} className="icon-spin" /> : <Icon name="rocket_launch" size={16} />}
          {prdLoading ? 'Generating...' : 'Generate PRD'}
        </button>
        <button
          onClick={save}
          disabled={!hasDeployConfig}
          className="px-6 py-2.5 rounded-full bg-secondary text-on-secondary font-semibold text-sm shadow-lg shadow-secondary/20 hover:opacity-90 transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
          title={!hasDeployConfig ? 'Configure n8n or Make.com in Settings first' : 'Deploy workflow'}
        >
          <Icon name="cloud_upload" size={16} /> Deploy
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  )
}
