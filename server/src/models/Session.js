import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, select: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  currentOrganizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true, strict: 'throw' });

sessionSchema.index({ tokenHash: 1 }, { unique: true });
export default mongoose.model('Session', sessionSchema);
