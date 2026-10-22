import { useEffect, useState } from 'react';
import { UserPlus, Users, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../lib/api.js';

export default function MembersPage({ role, onToast }) {
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [busy, setBusy] = useState(false);
  const canManage = role === 'org_admin';
  async function refresh() {
    setLoading(true); setError('');
    try {
      const [memberResult, invitationResult] = await Promise.all([api.listMembers(), api.listMyInvitations()]);
      setMembers(memberResult); setInvitations(invitationResult);
    } catch (err) { setError(err.message || 'Could not load members.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  async function invite(event) {
    event.preventDefault(); setBusy(true);
    try {
      const result = await api.inviteMember({ email, role: inviteRole });
      setEmail(''); await refresh();
      onToast?.(`Invitation created for ${result.email}. Ask them to sign in to accept it.`);
    } catch (err) { setError(err.message || 'Could not invite member.'); }
    finally { setBusy(false); }
  }
  async function acceptInvitation(invitation) {
    setBusy(true); setError('');
    try { await api.acceptInvitation(invitation.id); window.location.reload(); }
    catch (err) { setError(err.message || 'Could not accept invitation.'); setBusy(false); }
  }
  async function update(member, changes) {
    setBusy(true); setError('');
    try { await api.updateMember(member.id, changes); await refresh(); onToast?.('Member settings saved.'); }
    catch (err) { setError(err.message || 'Could not update member.'); }
    finally { setBusy(false); }
  }
  return <><div className="section-heading"><div><div className="eyebrow">ORGANIZATION ACCESS</div><h1>Members</h1><p>Manage who can view and resolve issues in this workspace.</p></div><button className="button button-secondary" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {invitations.length > 0 && <section className="panel invitation-panel"><div className="panel-heading"><div><h2><UserPlus size={17}/> Pending invitations</h2><p>Accept an invitation to join another organization.</p></div></div><div className="invitation-list">{invitations.map(invitation => <article className="invitation-row" key={invitation.id}><div className="member-avatar">{invitation.organizationName.slice(0,1).toUpperCase()}</div><div className="member-identity"><strong>{invitation.organizationName}</strong><span>Invited as {invitation.role.replace('_',' ')}</span></div><button className="button button-primary button-small" disabled={busy} onClick={() => acceptInvitation(invitation)}>Accept invitation</button></article>)}</div></section>}
    {canManage && <form className="panel member-invite" onSubmit={invite}><div className="member-invite-icon"><UserPlus size={19}/></div><div className="member-invite-copy"><h2>Invite by email</h2><p>Invite anyone by email as a member, handler, or organization admin. They must sign in with the invited email address to accept.</p><div className="member-invite-fields"><label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@organization.com"/></label><label>Role<select value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="member">Member — report and discuss</option><option value="handler">Handler — manage assigned issues</option><option value="org_admin">Admin — manage members and workspace settings</option></select></label><button className="button button-primary" disabled={busy}><UserPlus size={15}/> Invite</button></div></div></form>}
    {error && <div className="panel api-error-panel" role="alert"><strong>Could not complete the request</strong><p>{error}</p></div>}
    <section className="panel members-panel"><div className="panel-heading"><div><h2><Users size={17}/> Workspace members</h2><p>{members.length} membership records</p></div><span className="member-role-pill"><ShieldCheck size={13}/> {role?.replace('_',' ') || 'member'}</span></div>
      {loading ? <div className="loading-panel"><span className="loading-spinner"/> Loading members…</div> : members.length === 0 ? <div className="page-empty"><div className="empty-state-icon"><Users size={24}/></div><h2>No members found</h2><p>Members will appear here once they join this organization.</p></div> : <div className="members-list">{members.map(member => <article className="member-row" key={member.id}><div className="member-avatar">{(member.name || member.email).slice(0,1).toUpperCase()}</div><div className="member-identity"><strong>{member.name || member.email}</strong><span>{member.email}</span></div><span className={`member-status ${member.status}`}>{member.status}</span>{canManage && member.status !== 'invited' ? <div className="member-controls"><select aria-label={`Role for ${member.email}`} value={member.role} disabled={busy} onChange={e => update(member,{role:e.target.value})}><option value="member">Member</option><option value="handler">Handler</option><option value="org_admin">Admin</option></select><button className="button button-secondary button-small" disabled={busy} onClick={() => update(member,{status:member.status === 'suspended' ? 'active' : 'suspended'})}>{member.status === 'suspended' ? 'Reactivate' : 'Suspend'}</button></div> : <span className="member-role-label">{member.role.replace('_',' ')}</span>}</article>)}</div>}
    </section>
    <p className="members-note">For safety, you cannot suspend yourself or remove your own organization administrator access. Invitation email delivery requires SMTP settings in the server environment.</p>
  </>;
}
