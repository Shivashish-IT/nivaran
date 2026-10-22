import * as issues from '../services/issues.service.js';

export async function list(req, res) {
  const result = await issues.listIssues({ organizationId: req.organizationId, page: req.query.page, limit: req.query.limit, status: req.query.status, search: req.query.search });
  res.json({ success: true, data: result });
}
export async function create(req, res) {
  const issue = await issues.createIssue({ organizationId: req.organizationId, reporterId: req.user._id, input: req.body });
  res.status(201).json({ success: true, data: issue });
}
export async function getById(req, res) {
  const issue = await issues.getIssue({ organizationId: req.organizationId, issueId: req.params.issueId });
  res.json({ success: true, data: issue });
}
export async function updateStatus(req, res) {
  const issue = await issues.updateIssueStatus({ organizationId: req.organizationId, issueId: req.params.issueId, nextStatus: req.body.status, actorId: req.user._id, actorRole: req.membership.role });
  res.json({ success: true, data: issue });
}
export async function assign(req, res) {
  const issue = await issues.assignIssue({ organizationId: req.organizationId, issueId: req.params.issueId, assigneeId: req.body.assigneeId ?? null, actorId: req.user._id, actorRole: req.membership.role });
  res.json({ success: true, data: issue });
}
export async function assignableMembers(req, res) {
  const members = await issues.listAssignableMembers({ organizationId: req.organizationId });
  res.json({ success: true, data: members });
}
export async function listComments(req, res) {
  const comments = await issues.listIssueComments({ organizationId: req.organizationId, issueId: req.params.issueId });
  res.json({ success: true, data: comments });
}
export async function addComment(req, res) {
  const comment = await issues.addIssueComment({ organizationId: req.organizationId, issueId: req.params.issueId, authorId: req.user._id, body: req.body.body });
  res.status(201).json({ success: true, data: comment });
}
export async function activity(req, res) {
  const items = await issues.listIssueActivity({ organizationId: req.organizationId, issueId: req.params.issueId });
  res.json({ success: true, data: items });
}

export async function submitFeedback(req, res) {
  const issue = await issues.submitResolutionFeedback({ organizationId: req.organizationId, issueId: req.params.issueId, reporterId: req.user._id, rating: req.body.rating, comment: req.body.comment });
  res.json({ success: true, data: issue });
}

export async function uploadAttachment(req, res) {
  const attachment = await issues.addIssueAttachment({
    organizationId: req.organizationId, issueId: req.params.issueId, actorId: req.user._id, file: req.file,
  });
  res.status(201).json({ success: true, data: attachment });
}

export async function downloadAttachment(req, res) {
  const attachment = await issues.getIssueAttachment({
    organizationId: req.organizationId, issueId: req.params.issueId, attachmentId: req.params.attachmentId,
  });
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Content-Length', String(attachment.size));
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.downloadName}"; filename*=UTF-8''${encodeURIComponent(attachment.downloadName)}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(attachment.absolutePath);
}
