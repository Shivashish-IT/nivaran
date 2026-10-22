import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  slug: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  settings: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true, strict: 'throw' });

export default mongoose.model('Organization', organizationSchema);
