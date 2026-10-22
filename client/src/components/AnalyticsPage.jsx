import { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw, ClipboardList, Users, CalendarDays, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';

const statuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Info', 'Resolved', 'Closed', 'Reopened'];
const priorities = ['Urgent', 'High', 'Medium', 'Low'];
function Metric({ icon: Icon, label, value, detail }) { return <article className="panel analytics-metric"><span className="analytics-metric-icon"><Icon size={18}/></span><span className="analytics-metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>; }
function Breakdown({ title, values, order, total }) {
  return <section className="panel analytics-breakdown"><div className="panel-heading"><div><h2>{title}</h2><p>Counts across the current organization.</p></div></div>{order.map(name => { const count = values?.[name] || 0; const percent = total ? Math.round(count / total * 100) : 0; return <div className="analytics-bar-row" key={name}><div><span>{name}</span><strong>{count}</strong></div><div className="analytics-bar-track"><span style={{ width: `${percent}%` }}/></div></div>; })}</section>;
}
export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData(await api.getOrganizationAnalytics()); } catch (err) { setError(err.message || 'Could not load analytics.'); } finally { setLoading(false); } }, []);
  useEffect(() => { load(); }, [load]);
  const resolved = (data?.byStatus?.Resolved || 0) + (data?.byStatus?.Closed || 0);
  return <>
    <div className="section-heading"><div><div className="eyebrow">ORGANIZATION INSIGHTS</div><h1>Analytics</h1><p>Understand issue volume, progress, and team participation.</p></div><button className="button button-secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="panel api-error-panel" role="alert"><strong>Could not load analytics</strong><p>{error}</p><button className="button button-secondary button-small" onClick={load}>Try again</button></div>}
    {loading ? <div className="panel loading-panel"><span className="loading-spinner"/> Calculating organization metrics…</div> : data && <>
      <div className="analytics-metrics-grid"><Metric icon={ClipboardList} label="Total issues" value={data.total} detail="All saved issues"/><Metric icon={CalendarDays} label="Created in 30 days" value={data.createdLast30Days} detail="Recent incoming work"/><Metric icon={CheckCircle2} label="Resolved or closed" value={resolved} detail={data.total ? `${Math.round(resolved / data.total * 100)}% of all issues` : 'No issues yet'}/><Metric icon={Users} label="Active members" value={data.activeMembers} detail="Current organization"/></div>
      <div className="analytics-breakdown-grid"><Breakdown title="Issue status" values={data.byStatus} order={statuses} total={data.total}/><Breakdown title="Priority" values={data.byPriority} order={priorities} total={data.total}/></div>
      <p className="members-note">Metrics are calculated from persisted issues and memberships in this organization. This view currently reports totals and status/priority breakdowns, not historical trend charts.</p>
    </>}
  </>;
}
