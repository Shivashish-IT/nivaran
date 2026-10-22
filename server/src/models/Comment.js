import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  body: { type: String, required: true, trim: true, minlength: 1, maxlength: 4000 },
}, { timestamps: true, strict: 'throw' });

commentSchema.index({ organizationId: 1, issueId: 1, createdAt: 1 });
export default mongoose.model('Comment', commentSchema);
