import { Draft } from '../models/draft.model.js';
import getDataUri from '../utils/datauri.js';
import cloudinary from '../utils/cloudinary.js';

export const createDraft = async (req, res) => {
  try {
    const authorId = req.id;
    const { caption } = req.body;
    let imageUrl = null;
    if (req.file) {
      const fileUri = getDataUri(req.file);
      const cloudResp = await cloudinary.uploader.upload(fileUri);
      imageUrl = cloudResp.secure_url;
    }

    const draft = await Draft.create({ author: authorId, caption: caption || '', image: imageUrl });
    return res.status(201).json({ success: true, draft });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDrafts = async (req, res) => {
  try {
    const authorId = req.id;
    const drafts = await Draft.find({ author: authorId }).sort({ updatedAt: -1 });
    return res.status(200).json({ success: true, drafts });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getDraft = async (req, res) => {
  try {
    const authorId = req.id;
    const draftId = req.params.id;
    const draft = await Draft.findOne({ _id: draftId, author: authorId });
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDraft = async (req, res) => {
  try {
    const authorId = req.id;
    const draftId = req.params.id;
    const { caption } = req.body;
    const draft = await Draft.findOne({ _id: draftId, author: authorId });
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });

    if (req.file) {
      const fileUri = getDataUri(req.file);
      const cloudResp = await cloudinary.uploader.upload(fileUri);
      draft.image = cloudResp.secure_url;
    }
    if (typeof caption !== 'undefined') draft.caption = caption;
    await draft.save();
    return res.status(200).json({ success: true, draft });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    const authorId = req.id;
    const draftId = req.params.id;
    const draft = await Draft.findOneAndDelete({ _id: draftId, author: authorId });
    if (!draft) return res.status(404).json({ success: false, message: 'Draft not found' });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
