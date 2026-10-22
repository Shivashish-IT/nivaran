import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  reference: { type: String, required: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
  description: { type: String, required: true, trim: true, minlength: 12, maxlength: 5000 },
  category: { type: String, required: true, trim: true, maxlength: 80 },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  status: { type: String, enum: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Awaiting Info', 'Resolved', 'Closed', 'Reopened'], default: 'Submitted' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolutionSummary: { type: String, maxlength: 3000, default: '' },
  resolvedAt: { type: Date, default: null },
  feedbackRating: { type: Number, min: 1, max: 5, default: null },
  feedbackComment: { type: String, maxlength: 1000, default: '' },
  feedbackAt: { type: Date, default: null },
  attachments: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true, maxlength: 180 },
    mimeType: { type: String, enum: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], required: true },
    size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true, strict: 'throw' });

issueSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
issueSchema.index({ organizationId: 1, assigneeId: 1, status: 1 });
issueSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export default mongoose.model('Issue', issueSchema);
