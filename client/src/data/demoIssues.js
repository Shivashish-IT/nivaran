export const initialIssues = [
  { id: 'NVR-2481', title: 'Projector not working in Room 204', category: 'Facilities', priority: 'High', status: 'In Progress', reporter: 'Aarav Sharma', assignee: 'Facilities Team', updated: '12 min ago', initials: 'AS', color: 'blue' },
  { id: 'NVR-2480', title: 'Unable to access the campus Wi-Fi', category: 'IT Support', priority: 'Medium', status: 'Under Review', reporter: 'Meera Patel', assignee: 'IT Helpdesk', updated: '38 min ago', initials: 'MP', color: 'teal' },
  { id: 'NVR-2479', title: 'Water dispenser needs maintenance', category: 'Maintenance', priority: 'Low', status: 'Resolved', reporter: 'Rohan Verma', assignee: 'Facilities Team', updated: '1 hr ago', initials: 'RV', color: 'amber' },
  { id: 'NVR-2478', title: 'Request for software license renewal', category: 'IT Support', priority: 'Medium', status: 'Awaiting Info', reporter: 'Ananya Rao', assignee: 'IT Helpdesk', updated: '2 hrs ago', initials: 'AR', color: 'violet' },
  { id: 'NVR-2477', title: 'Library reading room lights flickering', category: 'Facilities', priority: 'High', status: 'Submitted', reporter: 'Kabir Singh', assignee: 'Unassigned', updated: '3 hrs ago', initials: 'KS', color: 'blue' },
];

export const activities = [
  { icon: 'check', title: 'Issue marked as resolved', detail: 'NVR-2479 · Water dispenser maintenance', time: '24 minutes ago', tone: 'success' },
  { icon: 'user', title: 'Issue assigned to IT Helpdesk', detail: 'NVR-2480 · Campus Wi-Fi access', time: '48 minutes ago', tone: 'blue' },
  { icon: 'message', title: 'New comment added', detail: 'NVR-2481 · Projector in Room 204', time: '1 hour ago', tone: 'teal' },
  { icon: 'plus', title: 'A new issue was submitted', detail: 'NVR-2477 · Library reading room lights', time: '3 hours ago', tone: 'blue' },
];
