import mongoose from 'mongoose';

const membershipSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['member', 'handler', 'org_admin'], required: true },
  status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
}, { timestamps: true, strict: 'throw' });

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
export default mongoose.model('Membership', membershipSchema);
