import { useState } from 'react'
import type { Opportunity } from '@/lib/types'
import Icon from '@/components/Icon'

interface Props {
  onClose: () => void
  onReload: () => void
  entries: Opportunity[]
  setEntries: (entries: Opportunity[]) => void
}

export default function SettingsModal({ onClose, onReload, entries, setEntries }: Props) {
  const [sbUrl, setSbUrl] = useState(localStorage.getItem('yp-sb-url') || '')
  const [sbKey, setSbKey] = useState(localStorage.getItem('yp-sb-key') || '')
  const [builderPw, setBuilderPw] = useState('')
  const [n8nUrl, setN8nUrl] = useState(localStorage.getItem('yp-n8n-url') || '')
  const [n8nKey, setN8nKey] = useState(localStorage.getItem('yp-n8n-key') || '')
  const [makeToken, setMakeToken] = useState(localStorage.getItem('yp-make-token') || '')
  const [makeTeam, setMakeTeam] = useState(localStorage.getItem('yp-make-team') || '')
  const [wImpact, setWImpact] = useState(40)
  const [wUrgency, setWUrgency] = useState(35)
  const [wFeasibility, setWFeasibility] = useState(25)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  function showMsg(m: string, t: 'ok' | 'err') { setMsg(m); setMsgType(t); setTimeout(() => setMsg(''), 4000) }

  function save() {
    if (sbUrl) localStorage.setItem('yp-sb-url', sbUrl.trim())
    if (sbKey) localStorage.setItem('yp-sb-key', sbKey.trim())
    if (builderPw) localStorage.setItem('yp-builder-pw', builderPw)
    if (n8nUrl) localStorage.setItem('yp-n8n-url', n8nUrl.trim())
    if (n8nKey) localStorage.setItem('yp-n8n-key', n8nKey.trim())
    if (makeToken) localStorage.setItem('yp-make-token', makeToken.trim())
    if (makeTeam) localStorage.setItem('yp-make-team', makeTeam.trim())
    if (wImpact + wUrgency + wFeasibility !== 100) {
      showMsg(`Weights must add to 100 (currently ${wImpact + wUrgency + wFeasibility})`, 'err')
      return
    }
    localStorage.setItem('yp-score-weights', JSON.stringify({ impact: wImpact / 100, urgency: wUrgency / 100, feasibility: wFeasibility / 100 }))
    showMsg('Settings saved!', 'ok')
    onReload()
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `triggr-flow-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    showMsg('JSON exported!', 'ok')
  }

  function exportCSV() {
    const headers = ['area', 'owner', 'frequency', 'pain', 'tools', 'score', 'priority', 'status', 'timesaved']
    const rows = entries.map(e => headers.map(h => {
      const val = String((e as unknown as Record<string, unknown>)[h] ?? '')
      return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val.replace(/"/g, '""')}"` : val
    }).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `triggr-flow-export.csv`
    a.click()
    showMsg('CSV exported!', 'ok')
  }

  function importData(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (!Array.isArray(data)) throw new Error('Invalid')
        setEntries(data)
        showMsg(`Imported ${data.length} entries!`, 'ok')
      } catch { showMsg('Invalid JSON file', 'err') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-headline font-bold text-on-surface">Settings</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors">
            <Icon name="close" size={20} />
          </button>
        </div>

        <Section title="Supabase">
          <Input label="Project URL" value={sbUrl} onChange={setSbUrl} placeholder="https://xxx.supabase.co" />
          <Input label="Anon Key" value={sbKey} onChange={setSbKey} type="password" placeholder="eyJ..." />
        </Section>

        <Section title="Builder">
          <Input label="New password" value={builderPw} onChange={setBuilderPw} type="password" placeholder="Leave blank to keep current" />
        </Section>

        <Section title="n8n Integration">
          <Input label="Instance URL" value={n8nUrl} onChange={setN8nUrl} placeholder="https://your-n8n.app.n8n.cloud" />
          <Input label="API Key" value={n8nKey} onChange={setN8nKey} type="password" placeholder="n8n API key" />
        </Section>

        <Section title="Make.com Integration">
          <Input label="API Token" value={makeToken} onChange={setMakeToken} type="password" placeholder="Make.com token" />
          <Input label="Team ID" value={makeTeam} onChange={setMakeTeam} placeholder="Team ID" />
        </Section>

        <Section title="Score Weights">
          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-[10px] font-bold text-on-surface-variant uppercase">Impact</label><input type="number" value={wImpact} onChange={e => setWImpact(parseInt(e.target.value) || 0)} className="field-input mt-1" /></div>
            <div><label className="text-[10px] font-bold text-on-surface-variant uppercase">Urgency</label><input type="number" value={wUrgency} onChange={e => setWUrgency(parseInt(e.target.value) || 0)} className="field-input mt-1" /></div>
            <div><label className="text-[10px] font-bold text-on-surface-variant uppercase">Feasibility</label><input type="number" value={wFeasibility} onChange={e => setWFeasibility(parseInt(e.target.value) || 0)} className="field-input mt-1" /></div>
          </div>
          <p className="text-[10px] text-on-surface-variant/50 mt-1.5">Weights are saved to this browser only. Must add to 100.</p>
        </Section>

        <div className="flex gap-2 flex-wrap mt-5">
          <button onClick={save} className="px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-all">Save</button>
          <button onClick={exportJSON} className="px-5 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container-low transition-colors">Export JSON</button>
          <button onClick={exportCSV} className="px-5 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container-low transition-colors flex items-center gap-1.5">
            <Icon name="download" size={16} /> Export CSV
          </button>
          <label className="px-5 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container-low transition-colors cursor-pointer">
            Import JSON <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
        </div>

        {msg && <p className={`text-xs mt-3 font-medium ${msgType === 'err' ? 'text-error' : 'text-[#008545]'}`}>{msg}</p>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 pb-5 border-b border-outline-variant/10 last:border-0">
      <h4 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3">{title}</h4>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/40" />
    </div>
  )
}
