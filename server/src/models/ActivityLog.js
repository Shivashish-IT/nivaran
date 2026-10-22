import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true, enum: ['issue_created', 'status_changed', 'issue_assigned', 'comment_added', 'feedback_added', 'attachment_added'] },
  previousValue: { type: String, maxlength: 300 },
  newValue: { type: String, maxlength: 300 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, strict: 'throw' });

activityLogSchema.index({ organizationId: 1, issueId: 1, createdAt: -1 });
activityLogSchema.index({ organizationId: 1, createdAt: -1 });
activityLogSchema.pre('findOneAndUpdate', function preventActivityMutation() { throw new Error('Activity history is append-only.'); });
activityLogSchema.pre('updateOne', function preventActivityUpdate() { throw new Error('Activity history is append-only.'); });
activityLogSchema.pre('deleteOne', function preventActivityDelete() { throw new Error('Activity history is append-only.'); });
activityLogSchema.pre('deleteMany', function preventActivityDeleteMany() { throw new Error('Activity history is append-only.'); });
export default mongoose.model('ActivityLog', activityLogSchema);
