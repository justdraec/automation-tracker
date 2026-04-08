import { Plus, Moon, Sun, Lock, Unlock, Settings, BarChart3 } from 'lucide-react'
import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'

interface Props {
  entries: Opportunity[]
  activeId: number | null
  builderMode: boolean
  dark: boolean
  onSelectOpportunity: (id: number) => void
  onNewOpportunity: () => void
  onToggleDark: () => void
  onToggleBuilder: () => void
  onOpenSettings: () => void
  onOpenBuildList: () => void
}

function StatusDot({ status }: { status: OpportunityStatus }) {
  const colors: Record<OpportunityStatus, string> = {
    'pending-review': 'bg-accent',
    'not-started': 'bg-blue-400',
    'in-progress': 'bg-amber-400',
    'built': 'bg-emerald-400',
    'on-hold': 'bg-red-400',
  }
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status] || 'bg-gray-400'}`} />
}

function ScorePill({ score }: { score: number }) {
  let cls = 'bg-[var(--score-low-bg)] text-[var(--score-low-text)]'
  if (score >= 7.5) cls = 'bg-[var(--score-high-bg)] text-[var(--score-high-text)]'
  else if (score >= 5) cls = 'bg-[var(--score-mid-bg)] text-[var(--score-mid-text)]'
  return <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cls}`}>{score}</span>
}

export default function Sidebar({
  entries, activeId, builderMode, dark,
  onSelectOpportunity, onNewOpportunity, onToggleDark, onToggleBuilder, onOpenSettings, onOpenBuildList
}: Props) {
  const highCount = entries.filter(e => e.priority === 'high').length
  const totalSaved = entries.reduce((a, e) => a + (parseFloat(e.timesaved) || 0), 0)

  return (
    <div className="w-64 flex-shrink-0 bg-sidebar-bg border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M9 2L4 9h5l-2 5 7-8H9l2-5z" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary leading-tight">Triggr Flow</p>
            <p className="text-[10px] text-text-hint">Opportunity Tracker</p>
          </div>
        </div>
        <button
          onClick={onNewOpportunity}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
        >
          <Plus size={16} /> New opportunity
        </button>
      </div>

      {/* Opportunity list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <p className="text-[10px] font-medium uppercase tracking-widest text-text-hint px-1 mb-2 mt-1">
          Opportunities
        </p>
        {entries.length === 0 ? (
          <p className="text-xs text-text-hint px-1 py-4">No opportunities yet. Start a conversation to capture one.</p>
        ) : (
          entries.map(e => (
            <button
              key={e.id}
              onClick={() => onSelectOpportunity(e.id)}
              className={`w-full text-left px-3 py-2.5 rounded-xl transition-all mb-0.5
                ${activeId === e.id
                  ? 'bg-sidebar-active border border-sidebar-active-border'
                  : 'hover:bg-app-bg border border-transparent'
                }`}
            >
              <p className="text-sm font-medium text-text-primary truncate">{e.area || 'Untitled'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <StatusDot status={(e.status || 'pending-review') as OpportunityStatus} />
                <span className="text-[11px] text-text-muted">{STATUS_LABELS[(e.status || 'pending-review') as OpportunityStatus]}</span>
                {e.score > 0 && <ScorePill score={e.score} />}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Build list button */}
      <div className="px-3 pb-2">
        <button
          onClick={onOpenBuildList}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-text-muted hover:bg-app-bg hover:text-text-primary transition-colors border border-transparent hover:border-border"
        >
          <BarChart3 size={14} /> Build list
        </button>
      </div>

      {/* Footer stats + controls */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          <span className="text-[11px] text-text-muted bg-app-bg border border-border rounded-full px-2 py-0.5">{entries.length} total</span>
          <span className="text-[11px] text-text-muted bg-app-bg border border-border rounded-full px-2 py-0.5">{highCount} high</span>
          {totalSaved > 0 && <span className="text-[11px] text-text-muted bg-app-bg border border-border rounded-full px-2 py-0.5">{totalSaved}h saved</span>}
        </div>
        <div className="flex items-center gap-1">
          <SidebarBtn onClick={onToggleDark} title={dark ? 'Light mode' : 'Dark mode'}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </SidebarBtn>
          <SidebarBtn onClick={onToggleBuilder} title="Builder mode" active={builderMode}>
            {builderMode ? <Unlock size={14} /> : <Lock size={14} />}
          </SidebarBtn>
          <SidebarBtn onClick={onOpenSettings} title="Settings">
            <Settings size={14} />
          </SidebarBtn>
        </div>
      </div>
    </div>
  )
}

function SidebarBtn({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
        ${active
          ? 'bg-accent/10 border border-accent/30 text-accent'
          : 'text-text-hint hover:text-text-muted hover:bg-app-bg border border-transparent'
        }`}
    >
      {children}
    </button>
  )
}
