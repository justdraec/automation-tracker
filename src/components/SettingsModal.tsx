import { useState } from 'react'
import { X } from 'lucide-react'
import type { Opportunity } from '@/lib/types'

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

  function exportData() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `automation-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    showMsg('Exported!', 'ok')
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

  const inputCls = "w-full px-3 py-2 rounded-lg border border-border bg-app-bg text-sm focus:border-step2 focus:outline-none focus:ring-2 focus:ring-step2/10"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-app-surface rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">Settings</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-app-bg text-text-muted"><X size={18} /></button>
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
            <div><label className="text-[10px] text-text-muted">Impact</label><input type="number" value={wImpact} onChange={e => setWImpact(parseInt(e.target.value) || 0)} className={inputCls} /></div>
            <div><label className="text-[10px] text-text-muted">Urgency</label><input type="number" value={wUrgency} onChange={e => setWUrgency(parseInt(e.target.value) || 0)} className={inputCls} /></div>
            <div><label className="text-[10px] text-text-muted">Feasibility</label><input type="number" value={wFeasibility} onChange={e => setWFeasibility(parseInt(e.target.value) || 0)} className={inputCls} /></div>
          </div>
          <p className="text-[10px] text-text-hint mt-1">Must add to 100</p>
        </Section>

        <div className="flex gap-2 flex-wrap mt-4">
          <button onClick={save} className="px-4 py-2 rounded-lg bg-step2 text-white text-sm font-medium">Save</button>
          <button onClick={exportData} className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-app-bg">Export JSON</button>
          <label className="px-4 py-2 rounded-lg border border-border text-sm text-text-muted hover:bg-app-bg cursor-pointer">
            Import JSON <input type="file" accept=".json" onChange={importData} className="hidden" />
          </label>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-app-bg">Close</button>
        </div>

        {msg && <p className={`text-xs mt-3 ${msgType === 'err' ? 'text-red-500' : 'text-emerald-600'}`}>{msg}</p>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 pb-4 border-b border-border last:border-0">
      <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-text-muted mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-border bg-app-bg text-sm focus:border-step2 focus:outline-none focus:ring-2 focus:ring-step2/10" />
    </div>
  )
}
