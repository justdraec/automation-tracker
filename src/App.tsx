import { useState, useEffect, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import ChatDiscovery from '@/components/ChatDiscovery'
import OpportunitiesList from '@/components/OpportunitiesList'
import BuildList from '@/components/BuildList'
import OpportunityDetail from '@/components/OpportunityDetail'
import SettingsModal from '@/components/SettingsModal'
import Icon from '@/components/Icon'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { fetchOpportunities, createOpportunity, updateOpportunity, deleteOpportunity, updateStatus } from '@/lib/supabase'

type ActiveView = 'chat' | 'list' | 'buildlist' | 'build-detail'

const VIEW_LABELS: Record<ActiveView, string> = {
  chat: 'AI Discovery',
  list: 'Opportunities',
  buildlist: 'Build List',
  'build-detail': 'Builder Validation',
}

export default function App() {
  const [entries, setEntries] = useState<Opportunity[]>([])
  const [dark, setDark] = useState(false)
  const [builderMode, setBuilderMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPwPrompt, setShowPwPrompt] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('chat')
  const [activeBuildDetailId, setActiveBuildDetailId] = useState<number | null>(null)

  const loadEntries = useCallback(async () => {
    try { const data = await fetchOpportunities(); setEntries(data) } catch { /* offline fallback */ }
  }, [])

  useEffect(() => {
    const savedDark = localStorage.getItem('yp-dark-mode')
    if (savedDark === 'true' || (!savedDark && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDark(true); document.documentElement.classList.add('dark')
    }
    loadEntries()
  }, [loadEntries])

  function toggleDark() { const next = !dark; setDark(next); document.documentElement.classList.toggle('dark', next); localStorage.setItem('yp-dark-mode', String(next)) }

  function toggleBuilder() {
    if (builderMode) { setBuilderMode(false); return }
    setPwInput(''); setPwError(false); setShowPwPrompt(true)
  }

  function checkPassword() {
    const pw = localStorage.getItem('yp-builder-pw') || ''
    if (!pw) { setPwError(true); return }
    if (pwInput === pw) { setBuilderMode(true); setShowPwPrompt(false) } else { setPwError(true) }
  }

  async function handleNewOpportunity(opp: Opportunity) {
    try {
      await createOpportunity(opp); await loadEntries()
      const data = await fetchOpportunities(); setEntries(data)
      if (data.length > 0) setActiveView('list')
    } catch (err) { console.error('Failed to save:', err) }
  }

  async function handleUpdate(opp: Opportunity) {
    try { await updateOpportunity(opp); await loadEntries() } catch (err) { console.error('Failed to update:', err) }
  }

  async function handleDelete(id: number) {
    try { await deleteOpportunity(id); setEntries(prev => prev.filter(e => e.id !== id)) } catch (err) { console.error('Failed to delete:', err) }
  }

  async function handleStatusChange(id: number, status: OpportunityStatus) {
    try { await updateStatus(id, status); setEntries(prev => prev.map(e => e.id === id ? { ...e, status } : e)) } catch (err) { console.error('Failed to update status:', err) }
  }

  const activeBuildEntry = activeBuildDetailId ? entries.find(e => e.id === activeBuildDetailId) : null

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        entries={entries}
        activeView={activeView}
        builderMode={builderMode}
        dark={dark}
        onSelectOpportunity={() => setActiveView('list')}
        onNewOpportunity={() => setActiveView('chat')}
        onToggleDark={toggleDark}
        onToggleBuilder={toggleBuilder}
        onOpenSettings={() => setShowSettings(true)}
        onOpenBuildList={() => setActiveView('buildlist')}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-8 sticky top-0 bg-surface/80 backdrop-blur-md z-40 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-on-surface-variant">Triggr Flow</span>
            <Icon name="chevron_right" size={16} className="text-outline-variant" />
            <span className="font-headline font-semibold text-on-surface">{VIEW_LABELS[activeView]}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
              <input type="text" placeholder="Search..." className="bg-surface-container-low rounded-full pl-9 pr-4 py-1.5 text-sm w-48 border border-outline-variant/20 outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-on-surface-variant/40" />
            </div>
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary text-xs font-bold flex items-center justify-center">TF</div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          <div className={activeView === 'chat' ? 'flex flex-col h-full' : 'hidden'}>
            <ChatDiscovery onSubmit={handleNewOpportunity} onNavigateToList={() => setActiveView('list')} />
          </div>
          <div className={activeView === 'list' ? 'flex flex-col h-full' : 'hidden'}>
            <OpportunitiesList entries={entries} builderMode={builderMode} onUpdate={handleUpdate} onDelete={handleDelete} onStatusChange={handleStatusChange} onSwitchToSubmit={() => setActiveView('chat')} />
          </div>
          <div className={activeView === 'buildlist' ? 'flex flex-col h-full' : 'hidden'}>
            <BuildList entries={entries} builderMode={builderMode} onOpenDetail={(id: number) => { setActiveBuildDetailId(id); setActiveView('build-detail') }} />
          </div>
          {activeView === 'build-detail' && activeBuildEntry && (
            <div className="flex flex-col h-full">
              <OpportunityDetail entry={activeBuildEntry} builderMode={builderMode} onUpdate={handleUpdate} onDelete={(id) => { handleDelete(id); setActiveView('buildlist') }} onStatusChange={handleStatusChange} />
            </div>
          )}
        </main>
      </div>

      {showPwPrompt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-headline font-bold mb-4 text-on-surface">Enter builder password</h3>
            <input type="password" value={pwInput} onChange={e => { setPwInput(e.target.value); setPwError(false) }} onKeyDown={e => e.key === 'Enter' && checkPassword()}
              placeholder={localStorage.getItem('yp-builder-pw') ? 'Password' : 'Set a password in Settings first'} autoFocus
              className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface-container-low text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            {pwError && <p className="text-xs text-error mt-2">{localStorage.getItem('yp-builder-pw') ? 'Incorrect password' : 'No password set. Go to Settings first.'}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={checkPassword} className="flex-1 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20">Unlock</button>
              <button onClick={() => setShowPwPrompt(false)} className="flex-1 py-2.5 rounded-full border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container-low transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} onReload={loadEntries} entries={entries} setEntries={setEntries} />}
    </div>
  )
}
