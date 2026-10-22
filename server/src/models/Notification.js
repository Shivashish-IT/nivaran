import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  type: { type: String, enum: ['issue_created', 'status_changed', 'issue_assigned', 'comment_added'], required: true },
  message: { type: String, required: true, maxlength: 240 },
  readAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw' });

notificationSchema.index({ recipientId:  1, organizationId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
export default mongoose.model('Notification', notificationSchema);
