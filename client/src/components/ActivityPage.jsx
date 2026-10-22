import { useCallback, useEffect, useState } from 'react';
import { Activity, RefreshCw, ArrowUpRight } from 'lucide-react';
import { api } from '../lib/api.js';

function describe(item) {
  const actor = item.actorId?.name || 'A team member';
  const issue = item.issueId?.reference || item.issueId?.title || 'an issue';
  if (item.action === 'issue_created') return `${actor} reported ${issue}`;
  if (item.action === 'status_changed') return `${actor} changed ${issue} from ${item.previousValue || 'a previous status'} to ${item.newValue || 'a new status'}`;
  if (item.action === 'issue_assigned') return `${actor} updated assignment for ${issue}`;
  if (item.action === 'comment_added') return `${actor} commented on ${issue}`;
  return `${actor} updated ${issue}`;
}

export default function ActivityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await api.listOrganizationActivity()); }
    catch (err) { setError(err.message || 'Could not load organization activity.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return <>
    <div className="section-heading"><div><div className="eyebrow">WORKSPACE HISTORY</div><h1>Activity</h1><p>A recent, organization-wide record of issue updates and conversations.</p></div><button className="button button-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="panel api-error-panel" role="alert"><strong>Could not load activity</strong><p>{error}</p><button className="button button-secondary button-small" onClick={load}>Try again</button></div>}
    <section className="panel activity-feed-panel">
      {loading ? <div className="loading-panel"><span className="loading-spinner"/> Loading activity…</div> : items.length ? <ol className="organization-activity-list">{items.map(item => <li key={item._id}><span className="activity-event-icon"><Activity size={16}/></span><div className="activity-event-copy"><strong>{describe(item)}</strong><p>{item.action.replaceAll('_', ' ')}</p></div><time>{new Date(item.createdAt).toLocaleString()}</time>{item.issueId?.reference && <span className="activity-reference">{item.issueId.reference} <ArrowUpRight size={12}/></span>}</li>)}</ol> : <div className="page-empty"><div className="empty-state-icon"><Activity size={24}/></div><h2>No activity yet</h2><p>Issue creation, status changes, assignments, and comments will appear here.</p></div>}
      {!loading && items.length > 0 && <p className="members-note">Showing the latest {items.length} events in this organization.</p>}
    </section>
  </>;
}
