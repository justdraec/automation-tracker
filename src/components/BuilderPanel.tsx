import { useState } from 'react'
import { ChevronDown, Plus, GripVertical, X, Rocket } from 'lucide-react'
import type { Opportunity, ProcessStep, Dependency } from '@/lib/types'
import { calcScore, getPriority, getScoreColor, getScoreLabel, IMPACT_CAL, URGENCY_CAL, FEASIBILITY_CAL } from '@/lib/scoring'

interface Props {
  entry: Opportunity
  onSave: (opp: Opportunity) => void
}

export default function BuilderPanel({ entry, onSave }: Props) {
  const [e, setE] = useState<Opportunity>({ ...entry })
  const [steps, setSteps] = useState<ProcessStep[]>(entry.processSteps || [])
  const [deps, setDeps] = useState<Dependency[]>(entry.dependencies || [])
  const [advTech, setAdvTech] = useState(false)
  const [advVal, setAdvVal] = useState(false)

  function update(field: keyof Opportunity, value: any) {
    setE(prev => ({ ...prev, [field]: value }))
  }

  function addStep() {
    setSteps(prev => [...prev, { id: String(Date.now()), desc: '', tool: '', operation: '', isAI: false }])
  }
  function removeStep(id: string) { setSteps(prev => prev.filter(s => s.id !== id)) }
  function updateStep(id: string, field: keyof ProcessStep, val: any) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s))
  }

  function addDep() { setDeps(prev => [...prev, { id: String(Date.now()), desc: '', status: 'pending', owner: '' }]) }
  function removeDep(id: string) { setDeps(prev => prev.filter(d => d.id !== id)) }
  function updateDep(id: string, field: keyof Dependency, val: any) {
    setDeps(prev => prev.map(d => d.id === id ? { ...d, [field]: val } : d))
  }

  function save() {
    const impact = e.impact || 3
    const urgency = e.urgency || 3
    const feasibility = e.feasibility || 3
    const score = calcScore(impact, urgency, feasibility)
    const priority = getPriority(score)
    const stepsText = steps.map((s, i) => `${i + 1}. ${s.desc}${s.tool ? ' [' + s.tool + ']' : ''}`).join('\n')
    const errorText = `Notify ${e.errorNotify || 'team'} via ${e.errorChannel}. Retry ${e.errorRetry}x. Fallback: ${e.errorFallback}.`
    const notesText = deps.map(d => `${d.desc} [${d.status}]${d.owner ? ' - ' + d.owner : ''}`).join('; ')

    const updated: Opportunity = {
      ...e,
      processSteps: steps,
      steps: stepsText,
      error: errorText,
      dependencies: deps,
      notes: notesText,
      impact, urgency, feasibility, score, priority,
      status: e.status === 'pending-review' ? 'not-started' : e.status,
    }
    onSave(updated)
  }

  const score = calcScore(e.impact, e.urgency, e.feasibility)
  const sc = getScoreColor(score)
  const sl = getScoreLabel(score)
  const deg = Math.round(score / 10 * 360)

  const toolOptions = [...new Set([...(e.toolChips || []), 'Manual', 'AI', 'Custom code', 'Gmail', 'Slack', 'Notion', 'Airtable', 'Google Sheets', 'Stripe'])]

  return (
    <div className="mt-4 p-5 bg-step2-bg border-2 border-step2-border rounded-[14px] animate-fade-in">
      <h4 className="text-sm font-bold text-step2-text uppercase tracking-wider mb-4">Builder Configuration</h4>

      {/* Client reference */}
      <div className="p-3 bg-step1-bg border border-step1-border rounded-lg mb-4 text-xs">
        <p className="font-bold text-step1 text-[10px] uppercase mb-2">Client's answers</p>
        <div className="grid grid-cols-2 gap-2">
          <div><span className="font-bold text-text-hint text-[10px]">TRIGGER</span><p>{e.clientTrigger || '--'}</p></div>
          <div><span className="font-bold text-text-hint text-[10px]">INPUT</span><p>{e.clientInput || '--'}</p></div>
          <div><span className="font-bold text-text-hint text-[10px]">STEPS</span><p className="whitespace-pre-line">{e.clientSteps || '--'}</p></div>
          <div><span className="font-bold text-text-hint text-[10px]">OUTPUT</span><p>{e.clientOutput || '--'}</p></div>
        </div>
      </div>

      {/* Tech spec */}
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
          <Field label="Trigger details">
            <textarea value={e.trigger} onChange={ev => update('trigger', ev.target.value)} className="field-input h-16" placeholder="Technical trigger config..." />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Input mapping">
            <textarea value={e.input} onChange={ev => update('input', ev.target.value)} className="field-input h-16" placeholder="Technical input spec..." />
          </Field>
          <Field label="Output spec">
            <textarea value={e.output} onChange={ev => update('output', ev.target.value)} className="field-input h-16" placeholder="Technical output spec..." />
          </Field>
        </div>

        {/* Steps builder */}
        <Field label="Process steps">
          <div className="space-y-1.5">
            {steps.map((s, i) => (
              <div key={s.id} className="grid grid-cols-[20px_1fr_100px_90px_40px_24px] gap-1.5 items-center bg-app-bg border border-border rounded-lg p-1.5">
                <GripVertical size={12} className="text-text-hint cursor-grab" />
                <input value={s.desc} onChange={ev => updateStep(s.id, 'desc', ev.target.value)} className="field-input-sm" placeholder={`Step ${i + 1}`} />
                <select value={s.tool} onChange={ev => updateStep(s.id, 'tool', ev.target.value)} className="field-input-sm">
                  <option value="">Tool...</option>
                  {toolOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={s.operation} onChange={ev => updateStep(s.id, 'operation', ev.target.value)} className="field-input-sm">
                  <option value="">Op...</option>
                  {['create','read','update','send','transform','decide'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <label className="flex items-center gap-0.5 text-[10px] text-ai font-bold cursor-pointer">
                  <input type="checkbox" checked={s.isAI} onChange={ev => updateStep(s.id, 'isAI', ev.target.checked)} className="w-3 h-3" /> AI
                </label>
                <button onClick={() => removeStep(s.id)} className="text-text-hint hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
            <button onClick={addStep} className="w-full py-2 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-step2 hover:text-step2 transition-colors flex items-center justify-center gap-1">
              <Plus size={12} /> Add step
            </button>
          </div>
        </Field>

        {/* Error handling */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Notify on error"><input value={e.errorNotify} onChange={ev => update('errorNotify', ev.target.value)} className="field-input" placeholder="e.g. Petya" /></Field>
          <Field label="Channel">
            <select value={e.errorChannel} onChange={ev => update('errorChannel', ev.target.value)} className="field-input">
              <option value="slack">Slack</option><option value="email">Email</option><option value="sms">SMS</option><option value="none">None</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Retry">
            <select value={e.errorRetry} onChange={ev => update('errorRetry', ev.target.value)} className="field-input">
              <option value="0">None</option><option value="1">1x</option><option value="3">3x</option><option value="5">5x</option>
            </select>
          </Field>
          <Field label="Build tool">
            <select value={e.tool} onChange={ev => update('tool', ev.target.value)} className="field-input">
              {['n8n','Make.com','Zapier','Custom Script','Power Automate','Retool','TBD'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Build time">
            <select value={e.buildtime} onChange={ev => update('buildtime', ev.target.value)} className="field-input">
              <option value="">Select...</option>
              {['Less than 1 day','1-2 days','3-5 days','1-2 weeks','More than 2 weeks'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Advanced tech (collapsible) */}
      <button onClick={() => setAdvTech(!advTech)} className="flex items-center justify-between w-full p-2.5 bg-app-bg border border-border rounded-lg text-xs font-semibold text-text-muted mb-3">
        <span>Advanced: Conditions, volume</span>
        <ChevronDown size={12} className={`transition-transform ${advTech ? 'rotate-180' : ''}`} />
      </button>
      {advTech && (
        <div className="mb-4 space-y-3 animate-fade-in">
          <Field label="Conditional logic"><textarea value={e.conditions} onChange={ev => update('conditions', ev.target.value)} className="field-input h-16" placeholder="If/then decisions..." /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Volume/run"><input type="number" value={e.volume} onChange={ev => update('volume', ev.target.value)} className="field-input" placeholder="Records" /></Field>
            <Field label="Rate limits"><input value={e.ratelimit} onChange={ev => update('ratelimit', ev.target.value)} className="field-input" placeholder="e.g. 100/day" /></Field>
          </div>
        </div>
      )}

      {/* Validation */}
      <h4 className="text-sm font-bold text-step3-text uppercase tracking-wider mb-3 mt-4">Validation</h4>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Slider label="Impact" value={e.impact} cal={IMPACT_CAL} onChange={v => update('impact', v)} />
        <Slider label="Urgency" value={e.urgency} cal={URGENCY_CAL} onChange={v => update('urgency', v)} />
        <Slider label="Feasibility" value={e.feasibility} cal={FEASIBILITY_CAL} onChange={v => update('feasibility', v)} />
      </div>

      {/* Score preview */}
      <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-app-surface mb-3" style={{ borderColor: sc.col + '40' }}>
        <div className="score-donut w-14 h-14 text-lg font-bold flex-shrink-0" style={{ background: `conic-gradient(${sc.col} ${deg}deg, var(--border-color) ${deg}deg)` }}>
          <span className="bg-app-surface w-10 h-10 rounded-full flex items-center justify-center" style={{ color: sc.col }}>{score}</span>
        </div>
        <div>
          <p className="font-bold text-sm">{sl.label}</p>
          <p className="text-xs text-text-muted">{sl.desc}</p>
        </div>
      </div>

      {/* AI involvement */}
      <div className="p-3 bg-ai-bg border border-ai-border rounded-lg mb-3">
        <p className="text-[10px] font-bold text-ai uppercase mb-2">AI Involvement</p>
        <select value={e.aiType} onChange={ev => update('aiType', ev.target.value)} className="field-input mb-2">
          <option value="none">No AI</option><option value="content">Content generation</option><option value="data">Data processing</option><option value="decision">Decision making</option><option value="multi">Multiple AI tasks</option>
        </select>
        {e.aiType !== 'none' && (
          <div className="grid grid-cols-2 gap-2">
            <select value={e.aiModel} onChange={ev => update('aiModel', ev.target.value)} className="field-input">
              {['Claude (Anthropic)','OpenAI GPT','Google Gemini','Meta Llama','Mistral','Local LLM','TBD'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input value={e.aiTask} onChange={ev => update('aiTask', ev.target.value)} className="field-input" placeholder="What will AI do?" />
          </div>
        )}
      </div>

      {/* Priority + metric type */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Field label="Priority">
          <select value={e.priority || getPriority(score)} onChange={ev => update('priority', ev.target.value)} className="field-input">
            <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </Field>
        <Field label="Metric type">
          <select value={e.metricType} onChange={ev => update('metricType', ev.target.value)} className="field-input">
            <option value="">General</option><option value="time">Time-based</option><option value="accuracy">Accuracy</option><option value="volume">Volume</option><option value="quality">Quality</option>
          </select>
        </Field>
      </div>

      {/* Dependencies */}
      <Field label="Dependencies">
        <div className="space-y-1.5">
          {deps.map(d => (
            <div key={d.id} className="grid grid-cols-[1fr_80px_80px_24px] gap-1.5 items-center">
              <input value={d.desc} onChange={ev => updateDep(d.id, 'desc', ev.target.value)} className="field-input-sm" placeholder="What's needed?" />
              <select value={d.status} onChange={ev => updateDep(d.id, 'status', ev.target.value as any)} className="field-input-sm">
                <option value="pending">Pending</option><option value="resolved">Resolved</option><option value="blocked">Blocked</option>
              </select>
              <input value={d.owner} onChange={ev => updateDep(d.id, 'owner', ev.target.value)} className="field-input-sm" placeholder="Owner" />
              <button onClick={() => removeDep(d.id)} className="text-text-hint hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
          <button onClick={addDep} className="text-xs text-text-muted hover:text-step3 transition-colors flex items-center gap-1">
            <Plus size={12} /> Add dependency
          </button>
        </div>
      </Field>

      {/* Advanced validation (collapsible) */}
      <button onClick={() => setAdvVal(!advVal)} className="flex items-center justify-between w-full p-2.5 bg-app-bg border border-border rounded-lg text-xs font-semibold text-text-muted mb-3 mt-3">
        <span>Advanced: Testing, rollback, approval</span>
        <ChevronDown size={12} className={`transition-transform ${advVal ? 'rotate-180' : ''}`} />
      </button>
      {advVal && (
        <div className="mb-4 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Testing strategy">
              <select value={e.testing} onChange={ev => update('testing', ev.target.value)} className="field-input">
                <option value="manual">Manual test</option><option value="parallel">Parallel run</option><option value="staged">Staged rollout</option><option value="direct">Direct deploy</option>
              </select>
            </Field>
            <Field label="Rollback plan"><input value={e.rollback} onChange={ev => update('rollback', ev.target.value)} className="field-input" placeholder="If it breaks..." /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Maintainer"><input value={e.maintainer} onChange={ev => update('maintainer', ev.target.value)} className="field-input" placeholder="Who monitors?" /></Field>
            <Field label="Review date"><input type="date" value={e.reviewDate} onChange={ev => update('reviewDate', ev.target.value)} className="field-input" /></Field>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-step2-border">
        <button onClick={save} className="px-5 py-2 rounded-lg bg-step3 text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Save configuration
        </button>
        <button onClick={save} className="px-5 py-2 rounded-lg bg-ai text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5">
          <Rocket size={14} /> Deploy workflow
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

function Slider({ label, value, cal, onChange }: { label: string; value: number; cal: string[]; onChange: (v: number) => void }) {
  return (
    <div className="p-3 bg-app-bg border border-border rounded-lg">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-bold text-text-muted">{label}</span>
        <span className="text-sm font-bold text-step3">{value}</span>
      </div>
      <input type="range" min={1} max={5} step={1} value={value} onChange={ev => onChange(parseInt(ev.target.value))}
             className="w-full h-1 bg-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-step3 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow" />
      <p className="text-[10px] text-text-hint mt-1 italic">{cal[value] || ''}</p>
    </div>
  )
}
