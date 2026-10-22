import { useEffect, useState } from 'react';
import { ArrowLeft, Clock3, Download, FileText, MessageCircle, Paperclip, Send, ShieldCheck } from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { NEXT_STATUSES } from '../lib/issues.js';
import { api } from '../lib/api.js';

function prettyAction(item) {
  const actor = item.actorId?.name || 'A team member';
  if (item.action === 'issue_created') return `${actor} reported this issue`;
  if (item.action === 'status_changed') return `${actor} changed status from ${item.previousValue} to ${item.newValue}`;
  if (item.action === 'issue_assigned') return `${actor} changed assignment from ${item.previousValue} to ${item.newValue}`;
  if (item.action === 'comment_added') return `${actor} added a comment`;
  if (item.action === 'feedback_added') return `${actor} submitted resolution feedback (${item.newValue})`;
  if (item.action === 'attachment_added') return `${actor} uploaded ${item.newValue || 'an attachment'}`;
  return `${actor} updated this issue`;
}
function dateLabel(value) { return value ? new Date(value).toLocaleString() : ''; }

export default function IssueDetail({ issueId, onBack, user, canAssign, onToast }) {
  const [issue, setIssue] = useState(null);
  const [members, setMembers] = useState([]);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState('5');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const [nextIssue, nextComments, nextActivity, nextMembers] = await Promise.all([
        api.getIssue(issueId), api.listIssueComments(issueId), api.listIssueActivity(issueId), canAssign ? api.listAssignableMembers() : Promise.resolve([]),
      ]);
      setIssue(nextIssue); setComments(nextComments); setActivity(nextActivity); setMembers(nextMembers);
      setAssigneeId(nextIssue.assigneeId?._id || nextIssue.assigneeId || '');
    } catch (err) { setError(err.message || 'Could not load issue details.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [issueId]);
  async function changeStatus(status) {
    setSaving(true);
    try { await api.updateIssueStatus(issueId, status); await load(); onToast(`Issue status updated to ${status}`); }
    catch (err) { onToast(err.message || 'Could not update status'); }
    finally { setSaving(false); }
  }
  async function saveAssignee(e) {
    e.preventDefault(); setSaving(true);
    try { await api.assignIssue(issueId, assigneeId || null); await load(); onToast('Issue assignment saved'); }
    catch (err) { onToast(err.message || 'Could not assign issue'); }
    finally { setSaving(false); }
  }
  async function submitComment(e) {
    e.preventDefault(); if (!commentText.trim()) return;
    setSaving(true);
    try { await api.addIssueComment(issueId, commentText); setCommentText(''); await load(); onToast('Comment added'); }
    catch (err) { onToast(err.message || 'Could not add comment'); }
    finally { setSaving(false); }
  }
  async function uploadAttachment(e) {
    e.preventDefault();
    if (!attachmentFile) return;
    setSaving(true);
    try { await api.uploadIssueAttachment(issueId, attachmentFile); setAttachmentFile(null); e.currentTarget.reset(); await load(); onToast('Attachment uploaded securely'); }
    catch (err) { onToast(err.message || 'Could not upload attachment'); }
    finally { setSaving(false); }
  }
  async function downloadAttachment(attachment) {
    try { await api.downloadIssueAttachment(issueId, attachment); }
    catch (err) { onToast(err.message || 'Could not download attachment'); }
  }
  async function submitFeedback(e) {
    e.preventDefault();
    setSaving(true);
    try { await api.submitResolutionFeedback(issueId, { rating: Number(feedbackRating), comment: feedbackComment }); await load(); onToast('Resolution feedback submitted'); }
    catch (err) { onToast(err.message || 'Could not submit feedback'); }
    finally { setSaving(false); }
  }
  if (loading) return <div className="panel loading-panel"><span className="loading-spinner"/> Loading issue details…</div>;
  if (error || !issue) return <div className="panel api-error-panel" role="alert"><strong>Issue unavailable</strong><p>{error || 'This issue could not be found.'}</p><button className="button button-secondary" onClick={onBack}>Back to issues</button></div>;
  const reporterName = issue.reporterId?.name || (String(issue.reporterId) === String(user?._id) ? user?.name : 'Organization member');
  const isReporter = String(issue.reporterId?._id || issue.reporterId) === String(user?._id);
  const isResolved = ['Resolved', 'Closed'].includes(issue.status);
  const assigneeName = issue.assigneeId?.name || members.find(member => member.id === String(issue.assigneeId))?.name || 'Unassigned';
  return <div className="issue-detail-page">
    <button className="text-link detail-back" onClick={onBack}><ArrowLeft size={15}/> Back to all issues</button>
    <div className="detail-heading"><div><div className="eyebrow">ISSUE {issue.reference}</div><h1>{issue.title}</h1><p>Reported by {reporterName} · {dateLabel(issue.createdAt)}</p></div><StatusBadge status={issue.status}/></div>
    <div className="detail-layout"><main className="detail-main">
      <section className="panel detail-card"><div className="detail-card-heading"><h2>Issue description</h2><span className={`priority priority-${(issue.priority || 'medium').toLowerCase()}`}><i/>{issue.priority}</span></div><p className="detail-description">{issue.description}</p><div className="detail-meta"><span><strong>Category</strong>{issue.category}</span><span><strong>Reporter</strong>{reporterName}</span><span><strong>Assignee</strong>{assigneeName}</span></div>
      <div className="detail-actions">{canAssign && <label>Update status<select value="" disabled={saving || !(NEXT_STATUSES[issue.status] || []).length} onChange={e => e.target.value && changeStatus(e.target.value)}><option value="">{saving ? 'Saving…' : 'Choose next status'}</option>{(NEXT_STATUSES[issue.status] || []).map(status => <option key={status} value={status}>{status}</option>)}</select></label>}
      {canAssign && <form className="assignment-form" onSubmit={saveAssignee}><label>Assign to<select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.name} · {member.role.replace('_', ' ')}</option>)}</select></label><button className="button button-secondary button-small" disabled={saving}>Save assignment</button></form>}</div></section>
      <section className="panel detail-card attachments-card"><div className="detail-card-heading"><h2><Paperclip size={16}/> Attachments</h2><span className="detail-count">{(issue.attachments || []).length}</span></div>
        {(issue.attachments || []).length ? <ul className="attachment-list">{issue.attachments.map(attachment => <li key={attachment._id}><FileText size={18}/><span className="attachment-details"><strong>{attachment.originalName}</strong><small>{(attachment.size / 1024).toFixed(0)} KB · {dateLabel(attachment.uploadedAt)}</small></span><button className="icon-button" type="button" aria-label={`Download ${attachment.originalName}`} title="Download attachment" onClick={() => downloadAttachment(attachment)}><Download size={16}/></button></li>)}</ul> : <div className="detail-empty">No attachments yet. Upload a PDF or image to provide supporting evidence.</div>}
        <form className="attachment-upload-form" onSubmit={uploadAttachment}><label htmlFor="issue-attachment">Add a file <small>PDF, JPEG, PNG, or WebP · max 5 MB</small></label><div className="attachment-upload-controls"><input id="issue-attachment" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setAttachmentFile(e.target.files?.[0] || null)} /><button className="button button-secondary button-small" disabled={saving || !attachmentFile}><Paperclip size={14}/> Upload file</button></div></form>
      </section>
      {isReporter && isResolved && <section className="panel detail-card resolution-feedback-card"><div className="detail-card-heading"><h2>Resolution feedback</h2>{issue.feedbackAt && <span className="detail-count">Submitted</span>}</div>{issue.feedbackAt ? <div className="resolution-feedback-result"><strong>Your rating: {issue.feedbackRating}/5</strong><p>{issue.feedbackComment || 'No additional comment provided.'}</p><small>Submitted {dateLabel(issue.feedbackAt)}</small></div> : <form className="resolution-feedback-form" onSubmit={submitFeedback}><p>Was this issue resolved satisfactorily? Your feedback helps improve future resolutions.</p><label>Rating<select value={feedbackRating} onChange={e => setFeedbackRating(e.target.value)}><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Acceptable</option><option value="2">2 — Poor</option><option value="1">1 — Unsatisfactory</option></select></label><label>Optional comment<textarea rows="3" maxLength="1000" value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="Share what went well or what could improve…"/></label><button className="button button-primary button-small" disabled={saving}>Submit feedback</button></form>}</section>}
      <section className="panel detail-card"><div className="detail-card-heading"><h2><MessageCircle size={16}/> Discussion</h2><span className="detail-count">{comments.length}</span></div>{comments.length ? <div className="comment-list">{comments.map(comment => <article className="comment-item" key={comment._id}><span className="comment-avatar">{(comment.authorId?.name || 'U').slice(0,1).toUpperCase()}</span><div><div className="comment-byline"><strong>{comment.authorId?.name || 'Team member'}</strong><time>{dateLabel(comment.createdAt)}</time></div><p>{comment.body}</p></div></article>)}</div> : <div className="detail-empty">No comments yet. Add context or ask a question to move this issue forward.</div>}
        <form className="comment-form" onSubmit={submitComment}><label className="sr-only" htmlFor="issue-comment">Add a comment</label><textarea id="issue-comment" rows="3" maxLength="4000" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Write a comment for your team…" required/><div><span>{commentText.length}/4000</span><button className="button button-primary button-small" disabled={saving || !commentText.trim()}><Send size={14}/> Add comment</button></div></form>
      </section>
    </main><aside className="detail-aside"><section className="panel detail-card"><div className="detail-card-heading"><h2><Clock3 size={16}/> Activity history</h2></div>{activity.length ? <ol className="timeline">{activity.map(item => <li key={item._id}><span className="timeline-dot"/><div><p>{prettyAction(item)}</p><time>{dateLabel(item.createdAt)}</time></div></li>)}</ol> : <div className="detail-empty">No activity recorded yet.</div>}</section><div className="detail-security-note"><ShieldCheck size={17}/><span><strong>Workspace-scoped</strong><small>Comments and activity are limited to this organization and issue.</small></span></div></aside></div>
  </div>;
}
