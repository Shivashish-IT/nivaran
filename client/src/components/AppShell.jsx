import { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
export default function AppShell({ children, active, onNavigate, mobileOpen, onMenu, onClose, query, onQuery, user, organizations, currentOrganizationId, onLogout, onOrganizationChange, role, totalIssues, unreadNotifications = 0 }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(value => !value)} active={active} onNavigate={onNavigate} mobileOpen={mobileOpen} onClose={onClose} user={user} organizations={organizations} currentOrganizationId={currentOrganizationId} role={role} totalIssues={totalIssues}/>
    <main className="main-shell">
      <Topbar onMenu={onMenu} query={query} onQuery={onQuery} onNavigate={onNavigate} user={user} organizations={organizations} currentOrganizationId={currentOrganizationId} onLogout={onLogout} onOrganizationChange={onOrganizationChange} active={active} unreadNotifications={unreadNotifications}/>
      <div className="main-content">{children}</div>
      <footer className="app-footer"><span>© 2026 Nivaran</span><span><i className="footer-status"/> Session protected <span className="footer-dot">·</span> Built for better resolutions</span></footer>
    </main>
  </div>;
}
