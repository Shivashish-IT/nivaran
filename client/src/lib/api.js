const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the Nivaran API. Start the backend and check your connection.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'The request could not be completed.');
  }
  return payload.data;
}

export const api = {
  me: () => request('/auth/me'),
  googleConfig: () => request('/auth/google/config'),
  googleSignIn: credential => request('/auth/google', { method: 'POST', body: { credential } }),
  updateProfile: values => request('/auth/profile', { method: 'PATCH', body: values }),
  register: values => request('/auth/register', { method: 'POST', body: values }),
  login: values => request('/auth/login', { method: 'POST', body: values }),
  requestPasswordReset: email => request('/auth/password-reset/request', { method: 'POST', body: { email } }),
  resetPassword: values => request('/auth/password-reset/confirm', { method: 'POST', body: values }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  listSessions: () => request('/auth/sessions'),
  revokeSession: id => request(`/auth/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  revokeOtherSessions: () => request('/auth/sessions/others', { method: 'DELETE' }),
  createOrganization: name => request('/organizations', { method: 'POST', body: { name } }),
  selectOrganization: id => request(`/organizations/${id}/select`, { method: 'POST' }),
  listIssues: ({ status = '', search = '', page = 1, limit = 100 } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status && status !== 'All statuses') params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    return request(`/issues?${params.toString()}`);
  },
  createIssue: values => request('/issues', { method: 'POST', body: values }),
  getIssue: id => request(`/issues/${encodeURIComponent(id)}`),
  updateIssueStatus: (id, status) => request(`/issues/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } }),
  listAssignableMembers: () => request('/issues/assignable-members'),
  assignIssue: (id, assigneeId) => request(`/issues/${encodeURIComponent(id)}/assign`, { method: 'POST', body: { assigneeId } }),
  listIssueComments: id => request(`/issues/${encodeURIComponent(id)}/comments`),
  addIssueComment: (id, body) => request(`/issues/${encodeURIComponent(id)}/comments`, { method: 'POST', body: { body } }),
  submitResolutionFeedback: (id, values) => request(`/issues/${encodeURIComponent(id)}/feedback`, { method: 'POST', body: values }),
  uploadIssueAttachment: async (id, file) => {
    const form = new FormData(); form.append('file', file);
    let response;
    try { response = await fetch(`${API_BASE}/issues/${encodeURIComponent(id)}/attachments`, { method: 'POST', credentials: 'include', body: form }); }
    catch { throw new Error('Cannot reach the Nivaran API. Start the backend and check your connection.'); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || 'The upload could not be completed.');
    return payload.data;
  },
  downloadIssueAttachment: async (issueId, attachment) => {
    let response;
    try { response = await fetch(`${API_BASE}/issues/${encodeURIComponent(issueId)}/attachments/${encodeURIComponent(attachment._id)}`, { credentials: 'include' }); }
    catch { throw new Error('Cannot reach the Nivaran API. Start the backend and check your connection.'); }
    if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload?.error?.message || 'The download could not be completed.'); }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = attachment.originalName; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  listIssueActivity: id => request(`/issues/${encodeURIComponent(id)}/activity`),
  listMembers: () => request('/organizations/members'),
  getOrganizationAnalytics: () => request('/organizations/analytics'),
  listOrganizationActivity: () => request('/organizations/activity'),
  listNotifications: () => request('/notifications'),
  markNotificationRead: id => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'POST' }),
  updateCurrentOrganization: values => request('/organizations/current', { method: 'PATCH', body: values }),
  inviteMember: values => request('/organizations/members/invite', { method: 'POST', body: values }),
  updateMember: (id, values) => request(`/organizations/members/${encodeURIComponent(id)}`, { method: 'PATCH', body: values }),
  listMyInvitations: () => request('/organizations/invitations'),
  acceptInvitation: id => request(`/organizations/invitations/${encodeURIComponent(id)}/accept`, { method: 'POST' }),
};
