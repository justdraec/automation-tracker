import type { Opportunity, OpportunityStatus } from '@/lib/types'
import { STATUS_LABELS } from '@/lib/types'
import Icon from '@/components/Icon'

interface Props {
  entries: Opportunity[]
  activeView: 'chat' | 'list' | 'buildlist'
  builderMode: boolean
  dark: boolean
  onSelectOpportunity: () => void
  onNewOpportunity: () => void
  onToggleDark: () => void
  onToggleBuilder: () => void
  onOpenSettings: () => void
  onOpenBuildList: () => void
}

function StatusDot({ status }: { status: OpportunityStatus }) {
  const colors: Record<OpportunityStatus, string> = {
    'pending-review': 'bg-primary-container',
    'not-started': 'bg-surface-container-high',
    'in-progress': 'bg-tertiary-fixed-dim',
    'built': 'bg-green-400',
    'on-hold': 'bg-error',
  }
  return <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status] || 'bg-outline'}`} />
}

function ScorePill({ score }: { score: number }) {
  let cls = 'bg-surface-container text-on-surface-variant'
  if (score >= 7.5) cls = 'bg-tertiary-fixed text-tertiary'
  else if (score >= 5) cls = 'bg-primary-fixed text-primary'
  return <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{score}</span>
}

export default function Sidebar({
  entries, activeView, builderMode, dark,
  onSelectOpportunity, onNewOpportunity, onToggleDark, onToggleBuilder, onOpenSettings, onOpenBuildList
}: Props) {
  const highCount = entries.filter(e => e.priority === 'high').length
  const totalSaved = entries.reduce((a, e) => a + (parseFloat(e.timesaved) || 0), 0)

  return (
    <div className="w-[256px] shrink-0 bg-surface-container-low border-r border-outline-variant/10 flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M9 2L4 9h5l-2 5 7-8H9l2-5z" fill="white"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-headline font-bold text-on-surface leading-tight">Triggr Flow</p>
            <p className="text-[10px] text-on-surface-variant">Opportunity Tracker</p>
          </div>
        </div>
        <button
          onClick={onNewOpportunity}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-semibold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          <Icon name="add" size={18} /> New opportunity
        </button>
      </div>

      {/* Nav items */}
      <div className="px-3 mb-2">
        <NavItem
          icon="smart_toy"
          label="AI Discovery"
          active={activeView === 'chat'}
          onClick={onNewOpportunity}
        />
        <NavItem
          icon="list_alt"
          label="Opportunities"
          active={activeView === 'list'}
          onClick={onSelectOpportunity}
        />
        <NavItem
          icon="bar_chart"
          label="Build List"
          active={activeView === 'buildlist'}
          onClick={onOpenBuildList}
        />
        <NavItem icon="analytics" label="Analytics" disabled />
        <NavItem icon="bolt" label="Automation" disabled />
      </div>

      {/* Opportunity list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 px-1 mb-2 mt-1">
          Recent
        </p>
        {entries.length === 0 ? (
          <p className="text-xs text-on-surface-variant/40 px-1 py-4">No opportunities yet.</p>
        ) : (
          entries.slice(0, 10).map(e => (
            <button
              key={e.id}
              onClick={onSelectOpportunity}
              className="w-full text-left px-3 py-2.5 rounded-xl transition-all mb-0.5 hover:bg-surface-container border border-transparent"
            >
              <p className="text-sm font-medium text-on-surface truncate">{e.area || 'Untitled'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <StatusDot status={(e.status || 'pending-review') as OpportunityStatus} />
                <span className="text-[11px] text-on-surface-variant">{STATUS_LABELS[(e.status || 'pending-review') as OpportunityStatus]}</span>
                {e.score > 0 && <ScorePill score={e.score} />}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer stats + controls */}
      <div className="px-4 py-3 border-t border-outline-variant/10">
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          <span className="text-[11px] text-on-surface-variant bg-surface-container rounded-full px-2.5 py-0.5 font-medium">{entries.length} total</span>
          <span className="text-[11px] text-on-surface-variant bg-surface-container rounded-full px-2.5 py-0.5 font-medium">{highCount} high</span>
          {totalSaved > 0 && <span className="text-[11px] text-on-surface-variant bg-surface-container rounded-full px-2.5 py-0.5 font-medium">{totalSaved}h saved</span>}
        </div>
        <div className="flex items-center gap-1">
          <SidebarBtn onClick={onToggleDark} title={dark ? 'Light mode' : 'Dark mode'}>
            <Icon name={dark ? 'light_mode' : 'dark_mode'} size={16} />
          </SidebarBtn>
          <SidebarBtn onClick={onToggleBuilder} title="Builder mode" active={builderMode}>
            <Icon name={builderMode ? 'lock_open' : 'lock'} size={16} />
          </SidebarBtn>
          <SidebarBtn onClick={onOpenSettings} title="Settings">
            <Icon name="settings" size={16} />
          </SidebarBtn>
        </div>
      </div>
    </div>
  )
}

function NavItem({ icon, label, active, disabled, onClick }: {
  icon: string; label: string; active?: boolean; disabled?: boolean; onClick?: () => void
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 mb-0.5 text-sm font-medium rounded-xl transition-all
        ${active
          ? 'border-l-4 border-primary bg-gradient-to-r from-primary-container/10 to-transparent text-primary font-semibold'
          : disabled
            ? 'text-on-surface/30 cursor-not-allowed'
            : 'text-on-surface/60 hover:bg-surface-container rounded-lg'
        }`}
      title={disabled ? 'Coming soon' : undefined}
    >
      <Icon name={icon} size={20} className={active ? 'text-primary' : disabled ? 'text-on-surface/20' : ''} />
      {label}
      {disabled && <span className="ml-auto text-[9px] bg-surface-container text-on-surface-variant/50 px-1.5 py-0.5 rounded-full font-bold uppercase">Soon</span>}
    </button>
  )
}

function SidebarBtn({ children, onClick, title, active }: {
  children: React.ReactNode; onClick: () => void; title: string; active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all
        ${active
          ? 'bg-primary/10 border border-primary/30 text-primary'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-transparent'
        }`}
    >
      {children}
    </button>
  )
}
