import { useEffect, useState } from 'react';
import { Save, ShieldCheck, UserRound, MonitorSmartphone, LogOut, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';

export default function SettingsPage({ user, onProfileUpdated }) {
  const [name, setName] = useState(user?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sessions, setSessions] = useState([]);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [sessionError, setSessionError] = useState('');
  async function loadSessions() {
    setSessionsBusy(true); setSessionError('');
    try { setSessions(await api.listSessions()); }
    catch (err) { setSessionError(err.message || 'Could not load active sessions.'); }
    finally { setSessionsBusy(false); }
  }
  useEffect(() => { loadSessions(); }, []);
  async function endSession(id) {
    setSessionError('');
    try { await api.revokeSession(id); await loadSessions(); setNotice('Session signed out successfully.'); }
    catch (err) { setSessionError(err.message || 'Could not end session.'); }
  }
  async function endOtherSessions() {
    setSessionError('');
    try { await api.revokeOtherSessions(); await loadSessions(); setNotice('All other sessions have been signed out.'); }
    catch (err) { setSessionError(err.message || 'Could not end other sessions.'); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try { const result = await api.updateProfile({ name }); onProfileUpdated?.(result.user); setNotice('Your profile was updated.'); }
    catch (err) { setError(err.message || 'Could not update your profile.'); }
    finally { setBusy(false); }
  }
  return <>
    <div className="section-heading"><div><div className="eyebrow">PERSONAL PREFERENCES</div><h1>Settings</h1><p>Update your profile and review your account security.</p></div></div>
    {error && <div className="panel api-error-panel" role="alert"><strong>Could not save settings</strong><p>{error}</p></div>}{notice && <div className="panel success-panel" role="status">{notice}</div>}
    <section className="panel profile-settings-card"><div className="panel-heading"><div><h2><UserRound size={17}/> Profile</h2><p>These details are shown to members of your organizations.</p></div></div><form className="profile-settings-form" onSubmit={save}><label>Full name<input value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={100} required/></label><label>Email address<input value={user?.email || ''} readOnly/><small>Email address changes are not available in this version.</small></label><button className="button button-primary" disabled={busy || name.trim().length < 2}><Save size={15}/>{busy ? 'Saving…' : 'Save profile'}</button></form></section>
    <section className="panel security-settings-card"><div className="security-settings-icon"><ShieldCheck size={20}/></div><div><h2>Password and session security</h2><p>Forgot your password? Sign out and use “Forgot password?” on the login screen to receive a secure reset link by email. Reset links expire after 30 minutes, and resetting your password signs out all sessions.</p><p>Nivaran stores only a hash of each session token. You can review active sessions below and revoke sessions you do not recognize.</p></div></section>
    <section className="panel profile-settings-card"><div className="panel-heading"><div><h2><MonitorSmartphone size={17}/> Active sessions</h2><p>Review signed-in sessions for your account. Ending another session prevents it from making further authenticated requests.</p></div><button type="button" className="button button-secondary" onClick={loadSessions} disabled={sessionsBusy}><RefreshCw size={15}/> Refresh</button></div>
      {sessionError && <div className="api-error-panel" role="alert"><p>{sessionError}</p></div>}
      {sessionsBusy && <p>Loading sessions…</p>}
      {!sessionsBusy && sessions.length === 0 && !sessionError && <p>No active sessions were found.</p>}
      {!sessionsBusy && sessions.map(session => <div key={session.id} className="session-row" style={{display:'flex',gap:'16px',alignItems:'center',justifyContent:'space-between',padding:'14px 0',borderTop:'1px solid var(--border,#e5e7eb)'}}>
        <div><strong>{session.current ? 'This device · Current session' : 'Other active session'}</strong><p>{session.organizationName} · Signed in {new Date(session.createdAt).toLocaleString()}</p><small>Expires {new Date(session.expiresAt).toLocaleString()}</small></div>
        {session.current ? <span className="members-note">Current</span> : <button type="button" className="button button-secondary" onClick={() => endSession(session.id)}><LogOut size={15}/> Sign out</button>}
      </div>)}
      {sessions.some(item => !item.current) && <div style={{paddingTop:'14px'}}><button type="button" className="button button-danger" onClick={endOtherSessions}><LogOut size={15}/> Sign out all other sessions</button></div>}
    </section>
  </>;
}
