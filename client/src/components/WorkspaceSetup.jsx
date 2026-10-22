import { useEffect, useState } from 'react';
import { Building2, Plus, Users } from 'lucide-react';
import { api } from '../lib/api.js';

export default function WorkspaceSetup({ user, onReady, onLogout }) {
  const [name, setName] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refreshInvitations() {
    try { setInvitations(await api.listMyInvitations()); } catch { /* Keep workspace creation available if invitation lookup fails. */ }
  }
  useEffect(() => { refreshInvitations(); }, []);

  async function createWorkspace(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const organization = await api.createOrganization(name.trim());
      onReady({ user, organizations: [organization], currentOrganizationId: organization.id, currentRole: organization.role });
    } catch (err) { setError(err.message || 'Could not create workspace.'); }
    finally { setBusy(false); }
  }

  async function accept(invitation) {
    setBusy(true); setError('');
    try {
      const organization = await api.acceptInvitation(invitation.id);
      const data = await api.me();
      onReady({ ...data, currentOrganizationId: organization.id });
    } catch (err) { setError(err.message || 'Could not accept invitation.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-layout"><section className="auth-story"><div className="auth-brand"><span className="brand-mark brand-logo-frame"><img className="nivaran-logo" src="/nivaran-logo.png" alt="Nivaran logo" /></span><span>Nivaran</span></div><div className="auth-story-copy"><span className="auth-eyebrow"><i/> ONE STEP TO GET STARTED</span><h1>Choose your <em>workspace.</em></h1><p>Join a team that invited you, or create a new organization to begin tracking and resolving issues.</p></div><div className="auth-story-footer"><span>© 2026 Nivaran</span><button className="auth-text-link" onClick={onLogout}>Sign out</button></div></section><section className="auth-form-side"><div className="auth-form-wrap"><div className="auth-form-heading"><span className="eyebrow">WORKSPACE SETUP</span><h2>Welcome, {user?.name?.split(' ')[0] || 'there'}</h2><p>Select an invitation or create your own workspace.</p></div>
    {invitations.length > 0 && <section className="panel invitation-panel"><div className="panel-heading"><div><h2><Users size={17}/> Invitations</h2><p>Join an existing organization.</p></div></div>{invitations.map(invitation => <div className="invitation-row" key={invitation.id}><div className="member-identity"><strong>{invitation.organizationName}</strong><span>Role: {invitation.role}</span></div><button className="button button-primary button-small" disabled={busy} onClick={() => accept(invitation)}>Accept</button></div>)}</section>}
    <form className="auth-form" onSubmit={createWorkspace}><label>New organization name<input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Northstar Services" minLength={2} maxLength={120} required/></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? 'Please wait…' : 'Create workspace'} <Plus size={16}/></button></form>
  </div></section></main>;
}
