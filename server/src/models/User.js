import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, unique: true, index: true },
  passwordHash: { type: String, required: false, select: false },
  googleSub: { type: String, sparse: true, unique: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true, strict: 'throw' });

userSchema.index({ email: 1 }, { unique: true });
export default mongoose.model('User', userSchema);
