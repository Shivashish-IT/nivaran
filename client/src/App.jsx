import { useEffect, useMemo, useState } from 'react';
import AuthScreen from './components/AuthScreen.jsx';
import WorkspaceSetup from './components/WorkspaceSetup.jsx';
import { api } from './lib/api.js';
import { Check, Clock3, FileCheck2, Filter, Plus, Search, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import AppShell from './components/AppShell.jsx';
import StatCard from './components/StatCard.jsx';
import IssueTable from './components/IssueTable.jsx';
import NewIssueModal from './components/NewIssueModal.jsx';
import IssueDetail from './components/IssueDetail.jsx';
import MembersPage from './components/MembersPage.jsx';
import ActivityPage from './components/ActivityPage.jsx';
import AnalyticsPage from './components/AnalyticsPage.jsx';
import OrganizationPage from './components/OrganizationPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import HelpPage from './components/HelpPage.jsx';
import NotificationsPage from './components/NotificationsPage.jsx';
import { toIssueView } from './lib/issues.js';

function SectionHeading({ eyebrow, title, description, action }) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function WelcomeBanner({ onCreate, name = 'there' }) {
  return <section className="welcome-banner">
    <div className="welcome-copy"><h2>Welcome back, {name.split(' ')[0]} <span>✳</span></h2><p>Here’s what’s happening across your organization today.</p><button className="button button-light" onClick={onCreate}><Plus size={16}/> Report an issue</button></div>
    <div className="banner-art" aria-hidden="true"><div className="art-ring ring-one"/><div className="art-ring ring-two"/><div className="art-ring ring-three"/><div className="art-core"><ShieldCheck size={38}/></div><div className="art-float float-top"><span className="float-check"><Check size={13}/></span><span><strong>Clear next steps</strong><small>From report to resolution</small></span></div><div className="art-float float-bottom"><span className="float-bars"><i/><i/><i/></span><span><strong>Shared accountability</strong><small>One place to move work forward</small></span></div></div>
  </section>;
}
function IssuesPage({ issues, onSelect, onSelectIssue, onCreate, onFilter, filter, query, onQuery, onStatusChange, busyIssueId, canManageWorkflow }) {
  const filtered = issues.filter(i => {
    const text = `${i.title} ${i.id} ${i.category} ${i.reporter} ${i.assignee}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (filter === 'All statuses' || i.status === filter);
  });
  return <><SectionHeading eyebrow="ISSUE MANAGEMENT" title="All issues" description="Review, prioritize, and keep every issue moving." action={<button className="button button-primary" onClick={onCreate}><Plus size={16}/> New issue</button>}/><section className="panel filter-panel"><div className="filter-search"><Search size={16}/><input placeholder="Search issues..." value={query} onChange={e => onQuery(e.target.value)} aria-label="Filter issues by keyword"/></div><div className="filter-select"><Filter size={15}/><select value={filter} onChange={e => onFilter(e.target.value)}><option>All statuses</option><option>Submitted</option><option>Under Review</option><option>Assigned</option><option>In Progress</option><option>Awaiting Info</option><option>Resolved</option><option>Closed</option><option>Reopened</option></select></div><span className="filter-count">{filtered.length} issues</span></section><IssueTable issues={filtered} onSelect={onSelect} onSelectIssue={onSelectIssue} onCreate={onCreate} onStatusChange={onStatusChange} busyIssueId={busyIssueId} canManageWorkflow={canManageWorkflow}/></>;
}
function Dashboard({ user, organizations, currentOrganizationId, onLogout, onOrganizationChange, role, onProfileUpdated, onOrganizationUpdated }) {
  const [issues, setIssues] = useState([]);
  const [totalIssues, setTotalIssues] = useState(0);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyIssueId, setBusyIssueId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [active, setActive] = useState('Overview');
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All statuses');
  const [toast, setToast] = useState('');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const filteredIssues = useMemo(() => issues, [issues]);
  useEffect(() => {
    let alive = true;
    const refreshNotifications = () => api.listNotifications().then(data => { if (alive) setUnreadNotifications(data.unreadCount || 0); }).catch(() => {});
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 60000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [currentOrganizationId, active]);

  useEffect(() => {
    let activeRequest = true;
    setLoadingIssues(true);
    setLoadError('');
    api.listIssues({
      status: active === 'All issues' ? filter : 'All statuses',
      search: query,
      page: 1,
      limit: 100,
    }).then(result => {
      if (!activeRequest) return;
      setIssues((result.items || []).map(toIssueView));
      setTotalIssues(result.total || 0);
    }).catch(error => {
      if (!activeRequest) return;
      setLoadError(error.message || 'Could not load issues.');
      setIssues([]);
      setTotalIssues(0);
    }).finally(() => { if (activeRequest) setLoadingIssues(false); });
    return () => { activeRequest = false; };
  }, [currentOrganizationId, query, filter, active, refreshKey]);
  const createIssue = async data => {
    const created = await api.createIssue(data);
    setIssues(prev => [toIssueView(created), ...prev.filter(item => item.dbId !== String(created._id))]);
    setTotalIssues(count => count + 1);
    setModalOpen(false);
    setActive('All issues');
    setToast('Issue saved to your organization');
    window.setTimeout(() => setToast(''), 3200);
  };
  const changeIssueStatus = async (issue, nextStatus) => {
    setBusyIssueId(issue.dbId);
    try {
      const updated = await api.updateIssueStatus(issue.dbId, nextStatus);
      setIssues(prev => prev.map(item => item.dbId === issue.dbId ? toIssueView(updated) : item));
      setToast(`Issue ${issue.id} moved to ${nextStatus}`);
      window.setTimeout(() => setToast(''), 3200);
    } catch (error) {
      setToast(error.message || 'Could not update issue status');
      window.setTimeout(() => setToast(''), 4200);
    } finally {
      setBusyIssueId('');
    }
  };
  const navigate = label => { setActive(label); setSelectedIssueId(''); if (label !== 'All issues') setFilter('All statuses'); };
  const openIssue = issue => { if (typeof issue === 'string') { setActive(issue); setSelectedIssueId(''); } else { setSelectedIssueId(issue.dbId); setActive('Issue detail'); } };
  const canAssign = ['handler', 'org_admin'].includes(role);
  const openModal = () => setModalOpen(true);
  return <AppShell active={active} onNavigate={navigate} user={user} organizations={organizations} currentOrganizationId={currentOrganizationId} onLogout={onLogout} onOrganizationChange={onOrganizationChange} mobileOpen={mobileOpen} onMenu={() => setMobileOpen(true)} onClose={() => setMobileOpen(false)} query={query} onQuery={setQuery} role={role} totalIssues={totalIssues} unreadNotifications={unreadNotifications}>
    {selectedIssueId ? <IssueDetail key={selectedIssueId} issueId={selectedIssueId} onBack={() => { setSelectedIssueId(''); setActive('All issues'); setRefreshKey(v => v + 1); }} user={user} canAssign={canAssign} onToast={message => { setToast(message); window.setTimeout(() => setToast(''), 3200); }}/> : active === 'Members' ? <MembersPage role={role} onToast={message => { setToast(message); window.setTimeout(() => setToast(''), 3200); }}/> : active === 'Activity' ? <ActivityPage/> : active === 'Notifications' ? <NotificationsPage onChanged={setUnreadNotifications} onOpenIssue={id => openIssue(id)} onToast={message => { setToast(message); window.setTimeout(() => setToast(''), 3200); }}/> : active === 'Analytics' ? <AnalyticsPage/> : active === 'Organization' ? <OrganizationPage organization={organizations.find(item => item.id === currentOrganizationId)} role={role} organizations={organizations} onOrganizationUpdated={onOrganizationUpdated}/> : active === 'Settings' ? <SettingsPage user={user} onProfileUpdated={onProfileUpdated}/> : active === 'Help center' ? <HelpPage/> : active === 'Overview' ? <>
      <SectionHeading eyebrow="YOUR ORGANIZATION" title="Overview" description="A clear view of the issues that matter most." action={<button className="button button-primary" onClick={openModal}><Plus size={16}/> Report an issue</button>}/>
      <WelcomeBanner onCreate={openModal} name={user?.name || 'there'}/>
      <div className="stats-grid">
        <StatCard icon={ClipboardListIcon} label="Matching issues" value={totalIssues} change="Live" note="Saved in this organization" tone="blue"/>
        <StatCard icon={Clock3} label="Open issues" value={issues.filter(i => !['Resolved', 'Closed'].includes(i.status)).length} change="Live" note="Across loaded issues" tone="amber"/>
        <StatCard icon={FileCheck2} label="Resolved / closed" value={issues.filter(i => ['Resolved', 'Closed'].includes(i.status)).length} change="Live" note="Across loaded issues" tone="teal"/>
        <StatCard icon={Zap} label="Urgent priority" value={issues.filter(i => i.priority === 'Urgent').length} change="Live" note="Across loaded issues" tone="violet"/>
      </div>
      {loadError ? <div className="panel api-error-panel" role="alert"><strong>Could not load your issues</strong><p>{loadError}</p><button className="button button-secondary button-small" onClick={() => setRefreshKey(v => v + 1)}>Retry</button></div> : loadingIssues ? <div className="panel loading-panel"><span className="loading-spinner"/> Loading organization issues…</div> : <IssueTable issues={filteredIssues} onSelect={navigate} onSelectIssue={openIssue} onCreate={openModal} onStatusChange={changeIssueStatus} busyIssueId={busyIssueId} canManageWorkflow={canAssign}/>}
    </> : active === 'All issues' ? <><IssuesPage issues={issues} onSelect={navigate} onSelectIssue={openIssue} onCreate={openModal} onFilter={setFilter} filter={filter} query={query} onQuery={setQuery} onStatusChange={changeIssueStatus} busyIssueId={busyIssueId} canManageWorkflow={canAssign}/>{loadingIssues && <div className="inline-loading">Loading issues…</div>}{loadError && <div className="api-error-panel" role="alert">{loadError}</div>}</> : <div className="panel page-empty"><h2>Section not found</h2><p>Choose a section from the navigation.</p></div>}
    <NewIssueModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createIssue}/>
    {toast && <div className="toast" role="status"><span><Check size={15}/></span>{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
  </AppShell>;
}
function ClipboardListIcon(props) {
  return <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3"/></svg>;
}


export default function App() {
  const [auth, setAuth] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let alive = true;
    api.me().then(data => { if (alive) setAuth(data); })
      .catch(err => { if (alive && !String(err.message).includes('Sign in is required') && !String(err.message).includes('session has expired')) setAuthError(err.message); })
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);

  async function logout() {
    try { await api.logout(); } catch { /* A revoked or expired cookie is already signed out. */ }
    setAuth(null);
  }

  async function changeOrganization(id) {
    const selected = await api.selectOrganization(id);
    setAuth(current => current ? { ...current, currentOrganizationId: selected.id, currentRole: selected.role } : current);
  }

  if (checking) return <div className="auth-loading"><span className="brand-mark brand-logo-frame"><img className="nivaran-logo" src="/nivaran-logo.png" alt="Nivaran logo" /></span><strong>Nivaran</strong><span>Checking your session…</span><div className="auth-loading-progress" role="progressbar" aria-label="Checking your session" aria-valuetext="Please wait"><span /></div></div>;
  if (!auth) return <><AuthScreen onAuthenticated={setAuth}/>{authError && <div className="api-connect-hint" role="status">{authError}</div>}</>;
  if (!(auth.organizations || []).length) return <WorkspaceSetup user={auth.user} onReady={setAuth} onLogout={logout}/>;
  return <Dashboard
    user={auth.user}
    organizations={auth.organizations || []}
    currentOrganizationId={auth.currentOrganizationId}
    role={auth.currentRole || auth.membership?.role || auth.organizations?.find(org => org.id === auth.currentOrganizationId)?.role || 'member'}
    onLogout={logout}
    onOrganizationChange={changeOrganization}
    onProfileUpdated={updatedUser => setAuth(current => current ? { ...current, user: updatedUser } : current)}
    onOrganizationUpdated={updated => setAuth(current => current ? { ...current, organizations: (current.organizations || []).map(org => org.id === updated.id ? { ...org, name: updated.name, slug: updated.slug } : org) } : current)}
  />;
}
