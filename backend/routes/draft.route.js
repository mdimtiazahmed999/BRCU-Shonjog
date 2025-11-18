import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { upload } from '../middlewares/multer.js';
import { createDraft, getDrafts, getDraft, updateDraft, deleteDraft } from '../controllers/draft.controller.js';

const router = express.Router();

router.route('/').post(isAuthenticated, upload.single('image'), createDraft);
router.route('/').get(isAuthenticated, getDrafts);
router.route('/:id').get(isAuthenticated, getDraft).put(isAuthenticated, upload.single('image'), updateDraft).delete(isAuthenticated, deleteDraft);

export default router;
