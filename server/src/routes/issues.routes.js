import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireOrganization } from '../middleware/requireOrganization.js';
import * as controller from '../controllers/issues.controller.js';
import multer from 'multer';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
await mkdir(env.uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, env.uploadDir),
    filename: (_req, file, cb) => {
      const extension = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '';
      cb(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowedTypes.has(file.mimetype)) return cb(new ApiError(400, 'UNSUPPORTED_ATTACHMENT_TYPE', 'Only PDF, JPEG, PNG, and WebP files are allowed.'));
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth, requireOrganization);
router.get('/assignable-members', controller.assignableMembers);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:issueId', controller.getById);
router.patch('/:issueId/status', controller.updateStatus);
router.post('/:issueId/assign', controller.assign);
router.get('/:issueId/comments', controller.listComments);
router.post('/:issueId/comments', controller.addComment);
router.post('/:issueId/feedback', controller.submitFeedback);
router.get('/:issueId/activity', controller.activity);
router.post('/:issueId/attachments', upload.single('file'), controller.uploadAttachment);
router.get('/:issueId/attachments/:attachmentId', controller.downloadAttachment);
export default router;
