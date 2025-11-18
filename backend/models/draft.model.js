import mongoose from 'mongoose';

const draftSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String, default: '' },
  image: { type: String, default: null },
}, { timestamps: true });

export const Draft = mongoose.model('Draft', draftSchema);
