import { useState } from 'react';
import { Building2, Save, PlusCircle } from 'lucide-react';
import { api } from '../lib/api.js';

export default function OrganizationPage({ organization, role, organizations = [], onOrganizationUpdated }) {
  const [name, setName] = useState(organization?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const isAdmin = role === 'org_admin';
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const updated = await api.updateCurrentOrganization({ name }); setName(updated.name); onOrganizationUpdated?.(updated); setNotice('Organization name saved.'); }
    catch (err) { setError(err.message || 'Could not update organization.'); }
    finally { setBusy(false); }
  }
  async function create() {
    const nextName = window.prompt('Name your new organization');
    if (!nextName?.trim()) return;
    setBusy(true); setError('');
    try { await api.createOrganization(nextName.trim()); window.location.reload(); }
    catch (err) { setError(err.message || 'Could not create organization.'); setBusy(false); }
  }
  return <>
    <div className="section-heading"><div><div className="eyebrow">WORKSPACE MANAGEMENT</div><h1>Organization</h1><p>Manage the active organization and switch between your workspaces.</p></div><button className="button button-secondary" onClick={create} disabled={busy}><PlusCircle size={15}/> New organization</button></div>
    {error && <div className="panel api-error-panel" role="alert"><strong>Could not complete the request</strong><p>{error}</p></div>}{notice && <div className="panel success-panel" role="status">{notice}</div>}
    <section className="panel organization-settings-card"><div className="organization-settings-icon"><Building2 size={22}/></div><div className="panel-heading"><div><h2>Active organization</h2><p>Changes apply to this organization only.</p></div><span className="member-role-pill">{role?.replace('_', ' ') || 'member'}</span></div>
      <form onSubmit={save} className="organization-settings-form"><label>Organization name<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} disabled={!isAdmin || busy} required/></label><label>Workspace slug<input value={organization?.slug || ''} readOnly/></label>{isAdmin ? <button className="button button-primary" disabled={busy || name.trim().length < 2}><Save size={15}/>{busy ? 'Saving…' : 'Save organization'}</button> : <p className="members-note">Only an organization admin can change organization settings.</p>}</form>
    </section>
    <section className="panel organization-list-card"><div className="panel-heading"><div><h2>Your organizations</h2><p>You currently have access to {organizations.length} organization{organizations.length === 1 ? '' : 's'}.</p></div></div><div className="organization-list">{organizations.map(item => <div className="organization-list-row" key={item.id}><span className="workspace-avatar">{item.name.slice(0,1).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.slug}</small></div><span className="member-role-label">{item.role.replace('_', ' ')}</span>{item.id === organization?.id && <span className="current-org-pill">Current</span>}</div>)}</div></section>
  </>;
}
