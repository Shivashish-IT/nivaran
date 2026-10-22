import { Bell, ChevronDown, Menu, Search, LogOut, Building2 } from 'lucide-react';

export default function Topbar({ onMenu, query, onQuery, onNavigate, user, organizations = [], currentOrganizationId, onLogout, onOrganizationChange, active = 'Overview', unreadNotifications = 0 }) {
  const current = organizations.find(item => item.id === currentOrganizationId);
  return <header className="topbar">
    <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={onMenu}><Menu size={21}/></button>
    <div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>{active}</strong></div>
    <div className="topbar-actions">
      <label className="global-search"><Search size={17}/><input value={query} onChange={e => onQuery(e.target.value)} placeholder="Search anything..." aria-label="Search issues"/><kbd>⌘ K</kbd></label>
      <button className="icon-button notification-button" aria-label={`Open notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} title="Notifications" onClick={() => onNavigate('Notifications')}><Bell size={19}/>{unreadNotifications > 0 && <span className="notification-count">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}</button>
      <span className="topbar-divider" />
      {organizations.length > 1 && <label className="organization-switcher" title="Switch organization"><Building2 size={14}/><select value={currentOrganizationId || ''} onChange={e => onOrganizationChange(e.target.value)} aria-label="Current organization">{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>}
      <button className="profile-chip" onClick={() => onNavigate('Settings')} title={user?.email || ''}><span className="user-avatar small-avatar">{(user?.name || 'N').split(' ').map(part => part[0]).join('').slice(0,2).toUpperCase()}</span><span className="profile-name">{user?.name || 'Account'}</span><ChevronDown size={15}/></button>
      <button className="icon-button logout-button" aria-label="Sign out" title="Sign out" onClick={onLogout}><LogOut size={17}/></button>
    </div>
  </header>;
}
