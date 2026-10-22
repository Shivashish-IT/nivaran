import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import * as controller from '../controllers/auth.controller.js';
import { requireOrganization } from '../middleware/requireOrganization.js';

const router = Router();
router.use(requireAuth);
router.post('/', controller.createOrganization);
router.post('/:organizationId/select', controller.selectOrganization);
router.get('/invitations', controller.listMyInvitations);
router.post('/invitations/:membershipId/accept', controller.acceptInvitation);
router.use(requireOrganization);
router.get('/analytics', controller.organizationAnalytics);
router.get('/activity', controller.organizationActivity);
router.patch('/current', controller.updateCurrentOrganization);
router.get('/members', controller.listMembers);
router.post('/members/invite', controller.inviteMember);
router.patch('/members/:membershipId', controller.updateMember);
export default router;
