import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireOrganization } from '../middleware/requireOrganization.js';
import * as controller from '../controllers/notifications.controller.js';

const router = Router();
router.use(requireAuth, requireOrganization);
router.get('/', controller.list);
router.post('/read-all', controller.markAllRead);
router.post('/:notificationId/read', controller.markRead);
export default router;
