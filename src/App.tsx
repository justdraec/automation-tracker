import { useState, useEffect, useCallback } from 'react'
import { Moon, Sun, Settings, Lock, Unlock, Grid3X3, Zap, Clock, BarChart3 } from 'lucide-react'
import ChatDiscovery from '@/components/ChatDiscovery'
import OpportunitiesList from '@/components/OpportunitiesList'
import BuildList from '@/components/BuildList'
import SettingsModal from '@/components/SettingsModal'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, updateStatus } from '@/lib/supabase'

type Tab = 'submit' | 'opportunities' | 'buildlist'

export default function App() {
  const [tab, setTab] = useState<Tab>('submit')
  const [entries, setEntries] = useState<Opportunity[]>([])
  const [dark, setDark] = useState(false)
  const [builderMode, setBuilderMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPwPrompt, setShowPwPrompt] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [syncStatus, setSyncStatus] = useState('Connecting...')

  const loadEntries = useCallback(async () => {
    setSyncStatus('Loading...')
    try {
      const data = await fetchOpportunities()
      setEntries(data)
      setSyncStatus('Synced')
    } catch {
      setSyncStatus('Offline')
    }
  }, [])

  useEffect(() => {
    const savedDark = localStorage.getItem('yp-dark-mode')
    if (savedDark === 'true' || (!savedDark && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true)
      document.documentElement.classList.add('dark')
    }
    loadEntries()
  }, [loadEntries])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('yp-dark-mode', String(next))
  }

  function toggleBuilder() {
    if (builderMode) {
      setBuilderMode(false)
      return
    }
    setPwInput('')
    setPwError(false)
    setShowPwPrompt(true)
  }

  function checkPassword() {
    const pw = localStorage.getItem('yp-builder-pw') || ''
    if (!pw) {
      setPwError(true)
      return
    }
    if (pwInput === pw) {
      setBuilderMode(true)
      setShowPwPrompt(false)
    } else {
      setPwError(true)
    }
  }

  async function handleNewOpportunity(opp: Opportunity) {
    try {
      await createOpportunity(opp)
      await loadEntries()
      setTab('opportunities')
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  async function handleUpdate(opp: Opportunity) {
    try {
      await updateOpportunity(opp)
      await loadEntries()
    } catch (err) {
      console.error('Failed to update:', err)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteOpportunity(id)
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  async function handleStatusChange(id: number, status: OpportunityStatus) {
    try {
      await updateStatus(id, status)
      setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const highCount = entries.filter(e => e.priority === 'high').length
  const avgScore = entries.length
    ? (entries.reduce((a, e) => a + (e.score || 0), 0) / entries.length).toFixed(1)
    : '--'
  const totalSaved = entries.reduce((a, e) => a + (parseFloat(e.timesaved) || 0), 0)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'submit', label: '+ Submit' },
    { id: 'opportunities', label: 'Opportunities' },
    { id: 'buildlist', label: 'Build List' },
  ]

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="bg-[#1c1917] dark:bg-[#0f0f1a] rounded-[14px] px-5 py-4 mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">Automation Opportunity Tracker</h1>
          <p className="text-xs text-white/40 mt-1">by Drae</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-1.5 flex-wrap">
            <Stat icon={<Grid3X3 size={13} />} label="Total" value={String(entries.length)} />
            <Stat icon={<Zap size={13} />} label="High" value={String(highCount)} />
            <Stat icon={<BarChart3 size={13} />} label="Avg" value={avgScore} />
            <Stat icon={<Clock size={13} />} label="Saved" value={`${totalSaved} hrs/wk`} />
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] ${syncStatus === 'Synced' ? 'text-emerald-400' : syncStatus === 'Offline' ? 'text-red-400' : 'text-white/40'}`}>
              {syncStatus}
            </span>
            <HeaderBtn onClick={toggleDark} title="Toggle dark mode">
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </HeaderBtn>
            <HeaderBtn onClick={toggleBuilder} title="Builder mode" active={builderMode}>
              {builderMode ? <Unlock size={14} /> : <Lock size={14} />}
            </HeaderBtn>
            <HeaderBtn onClick={() => setShowSettings(true)} title="Settings">
              <Settings size={14} />
            </HeaderBtn>
          </div>
          {builderMode && (
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">
              Builder mode
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-app-surface border border-border rounded-xl mb-5">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all
              ${tab === t.id
                ? 'bg-[#1c1917] dark:bg-[#2a2d4a] text-white shadow-md'
                : 'text-text-muted hover:bg-app-bg hover:text-text-primary'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'submit' && (
        <ChatDiscovery onSubmit={handleNewOpportunity} />
      )}
      {tab === 'opportunities' && (
        <OpportunitiesList
          entries={entries}
          builderMode={builderMode}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onSwitchToSubmit={() => setTab('submit')}
        />
      )}
      {tab === 'buildlist' && (
        <BuildList
          entries={entries}
          builderMode={builderMode}
        />
      )}

      {/* Password Prompt */}
      {showPwPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-app-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold mb-4">Enter builder password</h3>
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false) }}
              onKeyDown={e => e.key === 'Enter' && checkPassword()}
              placeholder="Password"
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg border border-border bg-app-bg text-sm
                         focus:border-step2 focus:outline-none focus:ring-2 focus:ring-step2/20"
            />
            {pwError && <p className="text-xs text-red-500 mt-2">Incorrect password</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={checkPassword} className="flex-1 py-2 rounded-lg bg-step2 text-white text-sm font-medium">
                Unlock
              </button>
              <button onClick={() => setShowPwPrompt(false)} className="flex-1 py-2 rounded-lg border border-border text-text-muted text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onReload={loadEntries}
          entries={entries}
          setEntries={setEntries}
        />
      )}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/[0.07] border border-white/[0.11] rounded-lg px-3 py-1.5 text-[11px] text-white/45">
      <span className="opacity-50">{icon}</span>
      {label} <span className="font-bold text-white">{value}</span>
    </div>
  )
}

function HeaderBtn({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg border transition-all text-white/50 hover:text-white hover:bg-white/10
        ${active ? 'bg-purple-600/30 border-purple-500/50 text-purple-300' : 'bg-white/[0.07] border-white/[0.11]'}`}
    >
      {children}
    </button>
  )
}
