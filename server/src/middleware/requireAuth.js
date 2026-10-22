import Session from '../models/Session.js';
import { hashSessionToken } from '../utils/credentials.js';
import { ApiError } from '../utils/ApiError.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.nivaran_session;
    if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Sign in is required for this action.');

    const session = await Session.findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: new Date() },
    }).select('+tokenHash').populate({ path: 'userId', select: 'name email status' });

    if (!session || !session.userId || session.userId.status !== 'active') {
      throw new ApiError(401, 'SESSION_INVALID', 'Your session has expired. Please sign in again.');
    }

    req.sessionDoc = session;
    req.user = session.userId;
    next();
  } catch (error) {
    next(error);
  }
}
