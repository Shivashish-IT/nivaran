import mongoose from 'mongoose';

const passwordResetTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  usedAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw' });

passwordResetTokenSchema.index({ userId: 1, usedAt: 1, createdAt: -1 });
export default mongoose.model('PasswordResetToken', passwordResetTokenSchema);
