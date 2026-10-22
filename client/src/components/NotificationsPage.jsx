import { useEffect, useState } from 'react';
import { Bell, CheckCheck, MessageCircle, UserRound, Workflow } from 'lucide-react';
import { api } from '../lib/api.js';

const iconByType = { issue_created: Bell, status_changed: Workflow, issue_assigned: UserRound, comment_added: MessageCircle };
const dateLabel = value => value ? new Date(value).toLocaleString() : '';

export default function NotificationsPage({ onOpenIssue, onChanged, onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function load() {
    setError('');
    try { const data = await api.listNotifications(); setItems(data.items || []); onChanged?.(data.unreadCount || 0); }
    catch (err) { setError(err.message || 'Could not load notifications.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function markAllRead() {
    setSaving(true);
    try { await api.markAllNotificationsRead(); await load(); onToast?.('All notifications marked as read.'); }
    catch (err) { onToast?.(err.message || 'Could not update notifications.'); }
    finally { setSaving(false); }
  }
  async function openItem(item) {
    try {
      if (!item.readAt) await api.markNotificationRead(item._id);
      setItems(current => current.map(row => row._id === item._id ? { ...row, readAt: row.readAt || new Date().toISOString() } : row));
      onChanged?.(Math.max(0, items.filter(row => !row.readAt && row._id !== item._id).length));
      if (item.issueId?._id) onOpenIssue?.(item.issueId._id);
    } catch (err) { onToast?.(err.message || 'Could not open notification.'); }
  }
  const unread = items.filter(item => !item.readAt).length;
  return <div className="notifications-page">
    <div className="section-heading"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Notifications</h1><p>Updates about issues you reported, manage, or follow.</p></div><button className="button button-secondary" disabled={!unread || saving} onClick={markAllRead}><CheckCheck size={15}/>{saving ? 'Saving…' : 'Mark all as read'}</button></div>
    {loading ? <div className="panel loading-panel"><span className="loading-spinner"/> Loading notifications…</div> : error ? <div className="panel api-error-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={load}>Retry</button></div> : items.length ? <div className="panel notification-list">{items.map(item => { const Icon = iconByType[item.type] || Bell; return <button className={`notification-item ${item.readAt ? 'notification-read' : 'notification-unread'}`} key={item._id} onClick={() => openItem(item)}><span className="notification-icon"><Icon size={17}/></span><span className="notification-copy"><strong>{item.message}</strong><span>{item.issueId?.reference || 'Issue update'}{item.issueId?.title ? ` · ${item.issueId.title}` : ''}</span><time>{dateLabel(item.createdAt)}</time></span>{!item.readAt && <span className="notification-unread-dot" aria-label="Unread"/>}</button>; })}</div> : <div className="panel page-empty"><span className="empty-state-icon"><Bell size={22}/></span><h2>You’re all caught up</h2><p>New issue assignments, comments, and status updates will appear here.</p></div>}
  </div>;
}
