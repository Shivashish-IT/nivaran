import { ArrowDownUp, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { NEXT_STATUSES } from '../lib/issues.js';

export default function IssueTable({ issues, onSelect, onSelectIssue, onCreate, onStatusChange, busyIssueId, canManageWorkflow = false }) {
  return <section className="panel issue-panel">
    <div className="panel-heading issue-panel-heading">
      <div><h2>Recent issues</h2><p>A quick look at what needs attention.</p></div>
      <button className="text-link" onClick={() => onSelect('All issues')}>View all issues <ArrowUpRight size={15}/></button>
    </div>
    {issues.length ? <div className="table-scroll"><table className="issue-table">
      <thead><tr><th><span>ISSUE <ArrowDownUp size={12}/></span></th><th>STATUS</th><th>PRIORITY</th><th>ASSIGNEE</th><th>UPDATED</th><th /></tr></thead>
      <tbody>{issues.slice(0,5).map(issue => <tr key={issue.id} onClick={() => onSelectIssue ? onSelectIssue(issue) : onSelect('All issues')} className="issue-row">
        <td><div className="issue-title-cell"><span className={`issue-avatar ${issue.color}`}>{issue.initials}</span><span className="issue-title-stack"><strong>{issue.title}</strong><small>{issue.id} <span>·</span> {issue.category}</small></span></div></td>
        <td><div className="status-cell"><StatusBadge status={issue.status}/>{onStatusChange && canManageWorkflow && <select className="status-change-select" aria-label={`Change status for ${issue.id}`} onClick={e => e.stopPropagation()} value="" disabled={busyIssueId === issue.dbId || !(NEXT_STATUSES[issue.status] || []).length} onChange={e => e.target.value && onStatusChange(issue, e.target.value)}><option value="">{busyIssueId === issue.dbId ? 'Saving…' : 'Update'}</option>{(NEXT_STATUSES[issue.status] || []).map(status => <option key={status} value={status}>{status}</option>)}</select>}</div></td>
        <td><span className={`priority priority-${issue.priority.toLowerCase()}`}><i/>{issue.priority}</span></td>
        <td><span className="assignee">{issue.assignee === 'Unassigned' ? <span className="unassigned">—</span> : <span className="assignee-avatar">{issue.assignee.slice(0,1)}</span>}{issue.assignee}</span></td>
        <td className="updated-cell">{issue.updated}</td>
        <td><button className="row-more" aria-label={`More options for ${issue.id}`} onClick={e => { e.stopPropagation(); onSelectIssue ? onSelectIssue(issue) : onSelect('All issues'); }}><MoreHorizontal size={18}/></button></td>
      </tr>)}</tbody>
    </table></div> : <div className="empty-table"><div className="empty-symbol">⌕</div><strong>No issues match your search</strong><span>Try a different keyword or clear your filters.</span><button className="button button-secondary button-small" onClick={onCreate}>Create an issue</button></div>}
    <div className="table-footer"><span>Showing <strong>{Math.min(issues.length,5)}</strong> of <strong>{issues.length}</strong> matching issues</span><button className="pagination-next" onClick={() => onSelect('All issues')}>See all issues <ArrowUpRight size={14}/></button></div>
  </section>;
}
