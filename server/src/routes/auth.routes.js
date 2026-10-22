
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/requireAuth.js';
import * as controller from '../controllers/auth.controller.js';

const router = Router();

const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT',
      message: 'Too many sign-in attempts. Please wait and try again.',
    },
  },
});

router.get('/google/config', asyncHandler(controller.googleConfig));
router.post('/google', authLimiter, asyncHandler(controller.googleSignIn));
router.post('/register', authLimiter, asyncHandler(controller.register));
router.post('/login', authLimiter, asyncHandler(controller.login));

router.post(
  '/password-reset/request',
  authLimiter,
  asyncHandler(controller.requestPasswordReset),
);

router.post(
  '/password-reset/confirm',
  authLimiter,
  asyncHandler(controller.resetPassword),
);

router.get('/me', requireAuth, asyncHandler(controller.me));
router.get('/sessions', requireAuth, asyncHandler(controller.listSessions));

router.delete(
  '/sessions/others',
  requireAuth,
  asyncHandler(controller.revokeOtherSessions),
);

router.delete(
  '/sessions/:sessionId',
  requireAuth,
  asyncHandler(controller.revokeSpecificSession),
);

router.patch('/profile', requireAuth, asyncHandler(controller.updateProfile));
router.post('/logout', requireAuth, asyncHandler(controller.logout));

export default router;

