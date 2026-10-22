export default function StatusBadge({ status }) {
  const styles = {
    'In Progress': 'progress',
    'Under Review': 'review',
    'Resolved': 'resolved',
    'Awaiting Info': 'waiting',
    'Submitted': 'submitted',
    'Closed': 'closed',
    'Reopened': 'reopened',
  };
  return <span className={`status-badge ${styles[status] || 'submitted'}`}><span className="status-dot" />{status}</span>;
}
