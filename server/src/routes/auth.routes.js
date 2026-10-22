import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'AUTH_RATE_LIMIT', message: 'Too many sign-in attempts. Please wait and try again.' } },
});

router.get('/google/config', controller.googleConfig);
router.post('/google', authLimiter, controller.googleSignIn);
router.post('/register', authLimiter, controller.register);
router.post('/login', authLimiter, controller.login);
router.post('/password-reset/request', authLimiter, controller.requestPasswordReset);
router.post('/password-reset/confirm', authLimiter, controller.resetPassword);
router.get('/me', requireAuth, controller.me);
router.get('/sessions', requireAuth, controller.listSessions);
router.delete('/sessions/others', requireAuth, controller.revokeOtherSessions);
router.delete('/sessions/:sessionId', requireAuth, controller.revokeSpecificSession);
router.patch('/profile', requireAuth, controller.updateProfile);
router.post('/logout', requireAuth, controller.logout);
export default router;
