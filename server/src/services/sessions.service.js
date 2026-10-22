import Session from '../models/Session.js';
import { env } from '../config/env.js';
import { createSessionToken, hashSessionToken } from '../utils/credentials.js';

export async function createSession(userId, currentOrganizationId = null) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + env.sessionDays * 24 * 60 * 60 * 1000);
  await Session.create({
    tokenHash: hashSessionToken(token),
    userId,
    currentOrganizationId,
    expiresAt,
  });
  return { token, expiresAt };
}

export async function revokeSession(sessionId) {
  if (sessionId) await Session.deleteOne({ _id: sessionId });
}
