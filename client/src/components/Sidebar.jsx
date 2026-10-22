import { Activity, BarChart3, Building2, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, LayoutDashboard, Settings2, ShieldCheck, Users, X } from 'lucide-react';

const manageLinks = [
  { label: 'Members', icon: Users },
  { label: 'Organization', icon: Building2 },
  { label: 'Settings', icon: Settings2 },
];

export default function Sidebar({ active, onNavigate, mobileOpen, onClose, user, organizations = [], currentOrganizationId, role = 'member', totalIssues = 0, collapsed = false, onToggleCollapse }) {
  const currentOrganization = organizations.find(item => item.id === currentOrganizationId);
  const mainLinks = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'All issues', icon: ClipboardList, count: totalIssues ? String(totalIssues) : undefined },
    { label: 'Activity', icon: Activity },
    { label: 'Analytics', icon: BarChart3 },
  ];
  const link = (item) => <button key={item.label} className={`nav-link ${active === item.label ? 'active' : ''}`} onClick={() => { onNavigate(item.label); onClose(); }}>
    <item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.count && <span className="nav-count">{item.count}</span>}
  </button>;
  return <>
    {mobileOpen && <button aria-label="Close navigation overlay" className="mobile-scrim" onClick={onClose} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''} ${collapsed ? 'sidebar-is-collapsed' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark brand-logo-frame"><img className="nivaran-logo" src="/nivaran-logo.png" alt="Nivaran logo" /></div>
        <div className="brand-wordmark"><span>Nivaran</span></div>
        <button className="icon-button sidebar-collapse-toggle" type="button" onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <ChevronRight size={17}/> : <ChevronLeft size={17}/>}</button>
        <button className="icon-button sidebar-close" aria-label="Close menu" onClick={onClose}><X size={19}/></button>
      </div>
      <button className="workspace-switcher" onClick={() => onNavigate('Organization')}>
        <span className="workspace-avatar">{(currentOrganization?.name || 'N').slice(0,1).toUpperCase()}</span>
        <span className="workspace-meta"><strong>{currentOrganization?.name || 'Your organization'}</strong><small>Organization workspace</small></span>
        <span className="switch-chevron">⌄</span>
      </button>
      <div className="nav-section-label">WORKSPACE</div>
      <nav className="nav-list">{mainLinks.map(link)}</nav>
      <div className="nav-section-label manage-label">MANAGE</div>
      <nav className="nav-list">{manageLinks.map(link)}</nav>
      <div className="sidebar-spacer" />
      <div className="help-card">
        <span className="help-icon"><CircleHelp size={17}/></span>
        <strong>Need a hand?</strong>
        <p>Visit the help center for tips and guidance.</p>
        <button onClick={() => onNavigate('Help center')}>Open help center <span>↗</span></button>
      </div>
      <div className="sidebar-user">
        <div className="user-avatar">{(user?.name || 'N').split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase()}</div>
        <div className="user-details"><strong>{user?.name || 'Account'}</strong><small>{role.replace('_', ' ')}</small></div>
        <button className="user-menu" aria-label="User menu" onClick={() => onNavigate('Settings')}>···</button>
      </div>
    </aside>
  </>;
}
