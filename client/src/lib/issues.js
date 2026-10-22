export const ISSUE_STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Info', 'Resolved', 'Closed', 'Reopened'];

export const NEXT_STATUSES = {
  Submitted: ['Under Review', 'Assigned'],
  'Under Review': ['Assigned', 'In Progress', 'Awaiting Info'],
  Assigned: ['In Progress', 'Awaiting Info'],
  'In Progress': ['Awaiting Info', 'Resolved'],
  'Awaiting Info': ['In Progress', 'Resolved'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['Under Review', 'Assigned', 'In Progress'],
};

export function toIssueView(issue) {
  const reporterName = issue.reporterId?.name || issue.reporter?.name || issue.reporterName || 'You';
  const assigneeName = issue.assigneeId?.name || issue.assignee?.name || issue.assigneeName || 'Unassigned';
  const nameParts = reporterName.split(/\s+/).filter(Boolean);
  const initials = nameParts.map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'YO';
  return {
    id: issue.reference || String(issue._id || issue.id),
    dbId: String(issue._id || issue.id),
    title: issue.title,
    description: issue.description,
    category: issue.category,
    priority: issue.priority || 'Medium',
    status: issue.status || 'Submitted',
    reporter: reporterName,
    assignee: assigneeName,
    updated: issue.updatedAt ? relativeTime(issue.updatedAt) : 'Just now',
    initials,
    color: 'blue',
    createdAt: issue.createdAt,
  };
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
