import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import Membership from '../models/Membership.js';
import { ApiError } from '../utils/ApiError.js';

export async function createIssueNotifications({ organizationId, issue, actorId, type, message, extraRecipientIds = [] }) {
  const recipients = new Set(extraRecipientIds.filter(Boolean).map(String));
  if (issue?.reporterId) recipients.add(String(issue.reporterId));
  if (issue?.assigneeId) recipients.add(String(issue.assigneeId));
  recipients.delete(String(actorId));
  if (!recipients.size) return [];
  return Notification.insertMany([...recipients].map(recipientId => ({
    organizationId, recipientId, actorId, issueId: issue._id, type, message,
  })), { ordered: false });
}

export async function notifyOrganizationHandlers({ organizationId, issue, actorId }) {
  const memberships = await Membership.find({ organizationId, status: 'active', role: { $in: ['handler', 'org_admin'] } }).select('userId').lean();
  return createIssueNotifications({ organizationId, issue, actorId, type: 'issue_created', message: `New issue reported: ${issue.title}`, extraRecipientIds: memberships.map(item => item.userId) });
}

export async function listNotifications({ organizationId, userId, limit = 30 }) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));
  const [items, unreadCount] = await Promise.all([
    Notification.find({ organizationId, recipientId: userId }).populate('actorId', 'name').populate('issueId', 'reference title status').sort({ createdAt: -1 }).limit(safeLimit).lean(),
    Notification.countDocuments({ organizationId, recipientId: userId, readAt: null }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationRead({ organizationId, userId, notificationId }) {
  if (!mongoose.isValidObjectId(notificationId)) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'The notification could not be found.');
  const item = await Notification.findOneAndUpdate({ _id: notificationId, organizationId, recipientId: userId, readAt: null }, { $set: { readAt: new Date() } }, { new: true }).lean();
  if (!item) {
    const exists = await Notification.exists({ _id: notificationId, organizationId, recipientId: userId });
    if (!exists) throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'The notification could not be found.');
  }
  return { success: true };
}

export async function markAllNotificationsRead({ organizationId, userId }) {
  await Notification.updateMany({ organizationId, recipientId: userId, readAt: null }, { $set: { readAt: new Date() } });
  return { success: true };
}
