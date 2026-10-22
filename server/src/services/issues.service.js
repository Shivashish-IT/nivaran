import mongoose from 'mongoose';
import { open, unlink } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import Issue from '../models/Issue.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import Comment from '../models/Comment.js';
import ActivityLog from '../models/ActivityLog.js';
import { ApiError } from '../utils/ApiError.js';
import { createIssueNotifications, notifyOrganizationHandlers } from './notifications.service.js';

const allowedTransitions = {
  Submitted: ['Under Review', 'Assigned'],
  'Under Review': ['Assigned', 'In Progress', 'Awaiting Info'],
  Assigned: ['In Progress', 'Awaiting Info'],
  'In Progress': ['Awaiting Info', 'Resolved'],
  'Awaiting Info': ['In Progress', 'Resolved'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Reopened: ['Under Review', 'Assigned', 'In Progress'],
};

export async function listIssues({ organizationId, page = 1, limit = 100, status, search }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const filter = { organizationId };
  const knownStatuses = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Info', 'Resolved', 'Closed', 'Reopened'];
  if (status && knownStatuses.includes(status)) filter.status = status;
  const normalizedSearch = String(search || '').trim().slice(0, 120);
  if (normalizedSearch) {
    const escaped = normalizedSearch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(escaped, 'i');
    filter.$or = [
      { reference: expression },
      { title: expression },
      { description: expression },
      { category: expression },
    ];
  }
  const [items, total] = await Promise.all([
    Issue.find(filter).populate('reporterId', 'name').populate('assigneeId', 'name email').sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Issue.countDocuments(filter),
  ]);
  return { items, page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) };
}

export async function createIssue({ organizationId, reporterId, input }) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  const category = String(input.category || '').trim();
  if (title.length < 5 || title.length > 120) throw new ApiError(400, 'INVALID_TITLE', 'Title must be between 5 and 120 characters.');
  if (description.length < 12 || description.length > 5000) throw new ApiError(400, 'INVALID_DESCRIPTION', 'Description must be between 12 and 5000 characters.');
  if (!category || category.length > 80) throw new ApiError(400, 'INVALID_CATEGORY', 'A valid category is required.');
  // Timestamp + random suffix avoids collisions when two issues are submitted concurrently.
  const reference = `NVR-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  // Reporter and organization IDs are supplied by trusted middleware, never the request body.
  const issue = await Issue.create({
    organizationId, reporterId, reference, title, description, category,
    priority: ['Low', 'Medium', 'High', 'Urgent'].includes(input.priority) ? input.priority : 'Medium',
  });
  await logActivity({ organizationId, issueId: issue._id, actorId: reporterId, action: 'issue_created', newValue: issue.status });
  await notifyOrganizationHandlers({ organizationId, issue, actorId: reporterId });
  return issue;
}

export async function getIssue({ organizationId, issueId }) {
  if (!mongoose.isValidObjectId(issueId)) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId }).populate('reporterId', 'name email').populate('assigneeId', 'name email').lean();
  if (!issue) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  return issue;
}

export async function updateIssueStatus({ organizationId, issueId, nextStatus, actorId, actorRole }) {
  if (!['handler', 'org_admin'].includes(actorRole)) throw new ApiError(403, 'STATUS_CHANGE_FORBIDDEN', 'Only handlers and organization admins can change issue status.');
  if (!mongoose.isValidObjectId(issueId)) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId });
  if (!issue) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  if (!Object.hasOwn(allowedTransitions, issue.status) || !allowedTransitions[issue.status].includes(nextStatus)) {
    throw new ApiError(409, 'INVALID_STATUS_TRANSITION', `Cannot change status from ${issue.status} to ${nextStatus}.`);
  }
  const previousStatus = issue.status;
  issue.status = nextStatus;
  if (nextStatus === 'Resolved') issue.resolvedAt = new Date();
  if (nextStatus === 'Reopened') issue.resolvedAt = null;
  await issue.save();
  await logActivity({ organizationId, issueId: issue._id, actorId, action: 'status_changed', previousValue: previousStatus, newValue: nextStatus });
  await createIssueNotifications({ organizationId, issue, actorId, type: 'status_changed', message: `Issue ${issue.reference} status changed to ${nextStatus}` });
  return issue.toObject();
}

async function logActivity(entry) {
  return ActivityLog.create(entry);
}

export async function assignIssue({ organizationId, issueId, assigneeId, actorId, actorRole }) {
  if (!['handler', 'org_admin'].includes(actorRole)) throw new ApiError(403, 'ASSIGNMENT_FORBIDDEN', 'Only handlers and organization admins can assign issues.');
  if (!mongoose.isValidObjectId(issueId)) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId });
  if (!issue) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  let assignee = null;
  if (assigneeId !== null && assigneeId !== '') {
    if (!mongoose.isValidObjectId(assigneeId)) throw new ApiError(400, 'INVALID_ASSIGNEE', 'Choose a valid organization member.');
    const membership = await Membership.findOne({ organizationId, userId: assigneeId, status: 'active', role: { $in: ['handler', 'org_admin'] } }).lean();
    if (!membership) throw new ApiError(400, 'INVALID_ASSIGNEE', 'The assignee must be an active handler or organization admin in this organization.');
    assignee = await User.findOne({ _id: assigneeId, status: 'active' }).select('name email').lean();
    if (!assignee) throw new ApiError(400, 'INVALID_ASSIGNEE', 'The selected assignee is not active.');
  }
  const previousId = issue.assigneeId ? String(issue.assigneeId) : '';
  const previousUser = previousId ? await User.findById(previousId).select('name').lean() : null;
  issue.assigneeId = assignee?._id || null;
  if (issue.status === 'Submitted' && assignee) issue.status = 'Assigned';
  await issue.save();
  await logActivity({ organizationId, issueId: issue._id, actorId, action: 'issue_assigned', previousValue: previousUser?.name || 'Unassigned', newValue: assignee?.name || 'Unassigned' });
  await createIssueNotifications({ organizationId, issue, actorId, type: 'issue_assigned', message: `Issue ${issue.reference} assigned to ${assignee?.name || 'nobody'}`, extraRecipientIds: assignee?._id ? [assignee._id] : [] });
  return Issue.findById(issue._id).populate('assigneeId', 'name email').lean();
}

export async function listAssignableMembers({ organizationId }) {
  const memberships = await Membership.find({ organizationId, status: 'active', role: { $in: ['handler', 'org_admin'] } }).select('userId role').lean();
  const ids = memberships.map(item => item.userId);
  const users = await User.find({ _id: { $in: ids }, status: 'active' }).select('name email').sort({ name: 1 }).lean();
  const roleById = new Map(memberships.map(item => [String(item.userId), item.role]));
  return users.map(user => ({ id: String(user._id), name: user.name, email: user.email, role: roleById.get(String(user._id)) }));
}

export async function addIssueComment({ organizationId, issueId, authorId, body }) {
  if (!mongoose.isValidObjectId(issueId)) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId }).select('_id').lean();
  if (!issue) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const normalized = String(body || '').trim();
  if (!normalized || normalized.length > 4000) throw new ApiError(400, 'INVALID_COMMENT', 'Comments must be between 1 and 4000 characters.');
  const comment = await Comment.create({ organizationId, issueId: issue._id, authorId, body: normalized });
  await logActivity({ organizationId, issueId: issue._id, actorId: authorId, action: 'comment_added' });
  await createIssueNotifications({ organizationId, issue, actorId: authorId, type: 'comment_added', message: `New comment on ${issue.reference}` });
  return Comment.findById(comment._id).populate('authorId', 'name email').lean();
}

export async function listIssueComments({ organizationId, issueId }) {
  if (!mongoose.isValidObjectId(issueId)) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId }).select('_id').lean();
  if (!issue) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  return Comment.find({ organizationId, issueId: issue._id }).populate('authorId', 'name').sort({ createdAt: 1 }).lean();
}

export async function listIssueActivity({ organizationId, issueId }) {
  if (!mongoose.isValidObjectId(issueId)) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId }).select('_id').lean();
  if (!issue) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  return ActivityLog.find({ organizationId, issueId: issue._id }).populate('actorId', 'name').sort({ createdAt: -1 }).limit(100).lean();
}


export async function submitResolutionFeedback({ organizationId, issueId, reporterId, rating, comment }) {
  if (!mongoose.isValidObjectId(issueId)) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId });
  if (!issue) throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.');
  if (String(issue.reporterId) !== String(reporterId)) throw new ApiError(403, 'FEEDBACK_FORBIDDEN', 'Only the person who reported this issue can provide resolution feedback.');
  if (!['Resolved', 'Closed'].includes(issue.status)) throw new ApiError(409, 'ISSUE_NOT_RESOLVED', 'Feedback is available after an issue is resolved.');
  if (issue.feedbackAt) throw new ApiError(409, 'FEEDBACK_ALREADY_SUBMITTED', 'Resolution feedback has already been submitted.');
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) throw new ApiError(400, 'INVALID_FEEDBACK_RATING', 'Choose a rating from 1 to 5.');
  const normalizedComment = String(comment || '').trim();
  if (normalizedComment.length > 1000) throw new ApiError(400, 'INVALID_FEEDBACK_COMMENT', 'Feedback comments must be 1000 characters or fewer.');
  issue.feedbackRating = numericRating;
  issue.feedbackComment = normalizedComment;
  issue.feedbackAt = new Date();
  await issue.save();
  await logActivity({ organizationId, issueId: issue._id, actorId: reporterId, action: 'feedback_added', newValue: `${numericRating}/5` });
  return issue.toObject();
}

const attachmentTypeSignatures = {
  'application/pdf': bytes => bytes.subarray(0, 5).toString('ascii') === '%PDF-',
  'image/jpeg': bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  'image/png': bytes => bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': bytes => bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP',
};

export async function addIssueAttachment({ organizationId, issueId, actorId, file }) {
  if (!file) throw new ApiError(400, 'ATTACHMENT_REQUIRED', 'Choose a file to upload.');
  const issue = await Issue.findOne({ _id: issueId, organizationId });
  if (!issue) { await unlink(file.path).catch(() => {}); throw new ApiError(404, 'ISSUE_NOT_FOUND', 'The requested issue could not be found.'); }
  let persisted = false;
  try {
    const handle = await open(file.path, 'r');
    const header = Buffer.alloc(16);
    let bytesRead;
    try { ({ bytesRead } = await handle.read(header, 0, header.length, 0)); } finally { await handle.close(); }
    const signatureCheck = attachmentTypeSignatures[file.mimetype];
    if (!signatureCheck || !signatureCheck(header.subarray(0, bytesRead))) {
      throw new ApiError(400, 'INVALID_ATTACHMENT_CONTENT', 'The file content does not match an allowed file type.');
    }
    const originalName = String(file.originalname || 'attachment').replace(/[\\/\x00-\x1f]/g, '_').trim().slice(0, 180) || 'attachment';
    const item = { storageKey: path.basename(file.filename), originalName, mimeType: file.mimetype, size: file.size, uploadedBy: actorId, uploadedAt: new Date() };
    issue.attachments.push(item);
    await issue.save();
    persisted = true;
    await logActivity({ organizationId, issueId: issue._id, actorId, action: 'attachment_added', newValue: originalName });
    const saved = issue.attachments[issue.attachments.length - 1];
    return { _id: String(saved._id), originalName: saved.originalName, mimeType: saved.mimeType, size: saved.size, uploadedAt: saved.uploadedAt, uploadedBy: String(saved.uploadedBy) };
  } catch (error) {
    if (!persisted) await unlink(file.path).catch(() => {});
    throw error;
  }
}

export async function getIssueAttachment({ organizationId, issueId, attachmentId }) {
  if (!mongoose.isValidObjectId(issueId) || !mongoose.isValidObjectId(attachmentId)) throw new ApiError(404, 'ATTACHMENT_NOT_FOUND', 'The requested attachment could not be found.');
  const issue = await Issue.findOne({ _id: issueId, organizationId }).select('attachments').lean();
  if (!issue) throw new ApiError(404, 'ATTACHMENT_NOT_FOUND', 'The requested attachment could not be found.');
  const item = issue.attachments.find(attachment => String(attachment._id) === String(attachmentId));
  if (!item || path.basename(item.storageKey) !== item.storageKey) throw new ApiError(404, 'ATTACHMENT_NOT_FOUND', 'The requested attachment could not be found.');
  const absolutePath = path.join(env.uploadDir, item.storageKey);
  return { absolutePath, mimeType: item.mimeType, size: item.size, downloadName: path.basename(item.originalName).replace(/[\"\r\n]/g, '_') };
}
