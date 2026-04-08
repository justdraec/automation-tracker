import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatDiscovery from '@/components/ChatDiscovery'
import OpportunityDetail from '@/components/OpportunityDetail'
import BuildList from '@/components/BuildList'
import SettingsModal from '@/components/SettingsModal'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, updateStatus } from '@/lib/supabase'

type ActiveView = 'chat' | 'opportunity' | 'buildlist'

export default function App() {
  const [entries, setEntries] = useState<Opportunity[]>([])
  const [dark, setDark] = useState(false)
  const [builderMode, setBuilderMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPwPrompt, setShowPwPrompt] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  const [activeView, setActiveView] = useState<ActiveView>('chat')
  const [activeOpportunityId, setActiveOpportunityId] = useState<number | null>(null)

  const loadEntries = useCallback(async () => {
    try {
      const data = await fetchOpportunities()
      setEntries(data)
    } catch {
      // silent — offline fallback
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
      // Select the newest entry
      const data = await fetchOpportunities()
      setEntries(data)
      if (data.length > 0) {
        setActiveView('opportunity')
        setActiveOpportunityId(data[0].id)
      }
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
      if (activeOpportunityId === id) {
        setActiveView('chat')
        setActiveOpportunityId(null)
      }
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

  const activeEntry = activeOpportunityId ? entries.find(e => e.id === activeOpportunityId) : null

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--app-bg)]">
      {/* Sidebar */}
      <Sidebar
        entries={entries}
        activeId={activeOpportunityId}
        builderMode={builderMode}
        dark={dark}
        onSelectOpportunity={(id) => {
          setActiveView('opportunity')
          setActiveOpportunityId(id)
        }}
        onNewOpportunity={() => {
          setActiveView('chat')
          setActiveOpportunityId(null)
        }}
        onToggleDark={toggleDark}
        onToggleBuilder={toggleBuilder}
        onOpenSettings={() => setShowSettings(true)}
        onOpenBuildList={() => {
          setActiveView('buildlist')
          setActiveOpportunityId(null)
        }}
      />

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeView === 'chat' && (
          <ChatDiscovery onSubmit={handleNewOpportunity} />
        )}
        {activeView === 'opportunity' && activeEntry && (
          <OpportunityDetail
            entry={activeEntry}
            builderMode={builderMode}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
          />
        )}
        {activeView === 'buildlist' && (
          <BuildList entries={entries} builderMode={builderMode} />
        )}
      </div>

      {/* Password Prompt */}
      {showPwPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold mb-4 text-[var(--text-primary)]">Enter builder password</h3>
            <input
              type="password"
              value={pwInput}
              onChange={e => { setPwInput(e.target.value); setPwError(false) }}
              onKeyDown={e => e.key === 'Enter' && checkPassword()}
              placeholder={localStorage.getItem('yp-builder-pw') ? 'Password' : 'Set a password in Settings first'}
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--app-bg)] text-sm
                         focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
            {pwError && <p className="text-xs text-red-500 mt-2">{localStorage.getItem('yp-builder-pw') ? 'Incorrect password' : 'No password set. Go to Settings first.'}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={checkPassword} className="flex-1 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors">
                Unlock
              </button>
              <button onClick={() => setShowPwPrompt(false)} className="flex-1 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] text-sm hover:bg-[var(--app-bg)] transition-colors">
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
