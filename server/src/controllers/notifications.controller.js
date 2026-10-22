import * as notifications from '../services/notifications.service.js';

export async function list(req, res) {
  const result = await notifications.listNotifications({ organizationId: req.organizationId, userId: req.user._id, limit: req.query.limit });
  res.json({ success: true, data: result });
}
export async function markRead(req, res) {
  const result = await notifications.markNotificationRead({ organizationId: req.organizationId, userId: req.user._id, notificationId: req.params.notificationId });
  res.json({ success: true, data: result });
}
export async function markAllRead(req, res) {
  const result = await notifications.markAllNotificationsRead({ organizationId: req.organizationId, userId: req.user._id });
  res.json({ success: true, data: result });
}
