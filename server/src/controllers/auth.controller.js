import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import Membership from '../models/Membership.js';
import Session from '../models/Session.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import Issue from '../models/Issue.js';
import ActivityLog from '../models/ActivityLog.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword, hashSessionToken } from '../utils/credentials.js';
import { sendPasswordResetEmail, sendInvitationEmail } from '../services/email.service.js';
import { createSession, revokeSession } from '../services/sessions.service.js';
import { env } from '../config/env.js';

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  // Render hosts the frontend and API on separate origins; cross-site fetch needs SameSite=None.
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/',
  maxAge: env.sessionDays * 24 * 60 * 60 * 1000,
});

function setSessionCookie(res, token) {
  res.cookie('nivaran_session', token, cookieOptions());
}

function clearSessionCookie(res) {
  res.clearCookie('nivaran_session', {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    path: '/',
  });
}

function slugify(value) {
  const base = value.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
  return base || 'workspace';
}

async function uniqueSlug(name) {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (await Organization.exists({ slug: candidate })) {
    candidate = `${base.slice(0, 44)}-${suffix++}`;
  }
  return candidate;
}

function safeUser(user) {
  return { id: String(user._id), name: user.name, email: user.email };
}

async function membershipPayload(userId) {
  const memberships = await Membership.find({ userId, status: 'active' })
    .populate({ path: 'organizationId', select: 'name slug status' }).lean();
  return memberships.filter(m => m.organizationId?.status === 'active').map(m => ({
    id: String(m.organizationId._id),
    name: m.organizationId.name,
    slug: m.organizationId.slug,
    role: m.role,
  }));
}

export function googleConfig(req, res) {
  if (!env.googleClientId) throw new ApiError(503, 'GOOGLE_SIGN_IN_NOT_CONFIGURED', 'Google sign-in is not configured on this server yet.');
  res.json({ success: true, data: { clientId: env.googleClientId } });
}

export async function googleSignIn(req, res) {
  const credential = String(req.body.credential || '');
  if (!credential || credential.length > 10000) throw new ApiError(400, 'GOOGLE_CREDENTIAL_REQUIRED', 'Google sign-in credential is missing. Please try again.');
  if (!env.googleClientId) throw new ApiError(503, 'GOOGLE_SIGN_IN_NOT_CONFIGURED', 'Google sign-in is not configured on this server yet.');

  let identity;
  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Google rejected the credential');
    identity = await response.json();
  } catch {
    throw new ApiError(401, 'GOOGLE_CREDENTIAL_INVALID', 'Google could not verify this sign-in. Please try again.');
  }
  if (identity.aud !== env.googleClientId || identity.email_verified !== 'true' || !identity.sub || !identity.email) {
    throw new ApiError(401, 'GOOGLE_CREDENTIAL_INVALID', 'Google account verification failed. Make sure you selected a verified Google account.');
  }

  const email = String(identity.email).trim().toLowerCase();
  const name = String(identity.name || email.split('@')[0]).trim().slice(0, 100) || email;
  let user = await User.findOne({ $or: [{ googleSub: identity.sub }, { email }] }).select('+passwordHash');
  if (user && user.status !== 'active') throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This Nivaran account is suspended. Contact an administrator.');
  if (user) {
    if (user.googleSub && user.googleSub !== identity.sub) throw new ApiError(409, 'GOOGLE_ACCOUNT_CONFLICT', 'This email is already linked to a different Google account.');
    if (!user.googleSub) user.googleSub = identity.sub;
    if (!user.name && name) user.name = name;
    user.lastLoginAt = new Date();
    await user.save();
  } else {
    user = await User.create({ name, email, googleSub: identity.sub, lastLoginAt: new Date() });
  }

  const organizations = await membershipPayload(user._id);
  const session = await createSession(user._id, organizations[0]?.id || null);
  setSessionCookie(res, session.token);
  res.json({ success: true, data: { user: safeUser(user), organizations, currentOrganizationId: organizations[0]?.id || null } });
}

export async function register(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const organizationName = String(req.body.organizationName || '').trim();

  if (name.length < 2 || name.length > 100) throw new ApiError(400, 'INVALID_NAME', 'Name must be between 2 and 100 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  if (password.length < 10 || password.length > 128) throw new ApiError(400, 'WEAK_PASSWORD', 'Password must be at least 10 characters.');
  if (organizationName.length < 2 || organizationName.length > 120) throw new ApiError(400, 'INVALID_ORGANIZATION', 'Organization name must be between 2 and 120 characters.');
  if (await User.exists({ email })) throw new ApiError(409, 'EMAIL_IN_USE', 'An account with this email already exists.');

  let user;
  let organization;
  let membership;
  let session;
  try {
    user = await User.create({ name, email, passwordHash: await hashPassword(password) });
    organization = await Organization.create({ name: organizationName, slug: await uniqueSlug(organizationName) });
    membership = await Membership.create({
      organizationId: organization._id,
      userId: user._id,
      role: 'org_admin',
      status: 'active',
    });
    session = await createSession(user._id, organization._id);
    setSessionCookie(res, session.token);
    return res.status(201).json({
      success: true,
      data: {
        user: safeUser(user),
        organizations: [{ id: String(organization._id), name: organization.name, slug: organization.slug, role: membership.role }],
        currentOrganizationId: String(organization._id),
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (user?._id) await User.deleteOne({ _id: user._id });
      if (organization?._id) await Organization.deleteOne({ _id: organization._id });
      if (membership?._id) await Membership.deleteOne({ _id: membership._id });
      throw new ApiError(409, 'ACCOUNT_CONFLICT', 'An account or organization with these details already exists. Please retry.');
    }
    if (session?.token) await Session.deleteOne({ userId: user?._id });
    if (membership?._id) await Membership.deleteOne({ _id: membership._id });
    if (organization?._id) await Organization.deleteOne({ _id: organization._id });
    if (user?._id) await User.deleteOne({ _id: user._id });
    throw error;
  }
}


export async function requestPasswordReset(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  }

  const genericResponse = { success: true, data: { message: 'If an active account exists for that email, password reset instructions will be sent.' } };
  const user = await User.findOne({ email, status: 'active' }).select('_id email').lean();
  if (user) {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null });
    await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt });
    const resetUrl = `${env.clientUrl.replace(/\/$/, '')}/?resetToken=${encodeURIComponent(token)}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error('Password reset email delivery failed:', error?.message || error);
    }
  }
  res.json(genericResponse);
}

export async function resetPassword(req, res) {
  const token = String(req.body.token || '');
  const password = String(req.body.password || '');
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or expired. Request a new one.');
  if (password.length < 10 || password.length > 128) throw new ApiError(400, 'WEAK_PASSWORD', 'Password must be between 10 and 128 characters.');

  const tokenHash = hashSessionToken(token);
  const reset = await PasswordResetToken.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: new Date() } });
  if (!reset) throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or expired. Request a new one.');
  // Check the account before consuming the one-time token so an inactive/deleted account
  // does not lose its token without a password update.
  const accountExists = await User.exists({ _id: reset.userId, status: 'active' });
  if (!accountExists) throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or expired. Request a new one.');

  const passwordHash = await hashPassword(password);
  const consumedAt = new Date();
  const consumed = await PasswordResetToken.updateOne(
    { _id: reset._id, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: consumedAt } },
  );
  if (consumed.modifiedCount !== 1) throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or expired. Request a new one.');

  const updated = await User.updateOne({ _id: reset.userId, status: 'active' }, { $set: { passwordHash } });
  if (updated.modifiedCount !== 1) {
    // Roll back token consumption if the account became unavailable between checks.
    await PasswordResetToken.updateOne({ _id: reset._id, usedAt: consumedAt }, { $set: { usedAt: null } });
    throw new ApiError(400, 'INVALID_RESET_TOKEN', 'This password reset link is invalid or expired. Request a new one.');
  }
  await Session.deleteMany({ userId: reset.userId });
  await PasswordResetToken.deleteMany({ userId: reset.userId, _id: { $ne: reset._id } });
  res.json({ success: true, data: { message: 'Password reset successfully. Sign in with your new password.' } });
}

export async function login(req, res) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) throw new ApiError(400, 'CREDENTIALS_REQUIRED', 'Email and password are required.');

  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user && user.status === 'active' && await verifyPassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');

  const organizations = await membershipPayload(user._id);
  if (!organizations.length) throw new ApiError(403, 'NO_ACTIVE_ORGANIZATION', 'Your account has no active organization. Contact an administrator.');

  user.lastLoginAt = new Date();
  await user.save();
  const session = await createSession(user._id, organizations[0].id);
  setSessionCookie(res, session.token);
  res.json({ success: true, data: { user: safeUser(user), organizations, currentOrganizationId: organizations[0].id } });
}

export async function me(req, res) {
  const organizations = await membershipPayload(req.user._id);
  res.json({
    success: true,
    data: {
      user: safeUser(req.user),
      organizations,
      currentOrganizationId: req.sessionDoc.currentOrganizationId ? String(req.sessionDoc.currentOrganizationId) : null,
      currentRole: organizations.find(org => org.id === String(req.sessionDoc.currentOrganizationId))?.role || null,
    },
  });
}

export async function listSessions(req, res) {
  const currentToken = req.cookies?.nivaran_session || '';
  const currentHash = currentToken ? hashSessionToken(currentToken) : '';
  const sessions = await Session.find({ userId: req.user._id, expiresAt: { $gt: new Date() } })
    .select('_id tokenHash createdAt updatedAt expiresAt currentOrganizationId')
    .populate({ path: 'currentOrganizationId', select: 'name' })
    .sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: sessions.map(item => ({
    id: String(item._id),
    createdAt: item.createdAt,
    lastActivityAt: item.updatedAt,
    expiresAt: item.expiresAt,
    organizationName: item.currentOrganizationId?.name || 'Nivaran',
    current: Boolean(currentHash && item.tokenHash === currentHash),
  })) });
}

export async function revokeOtherSessions(req, res) {
  await Session.deleteMany({ userId: req.user._id, _id: { $ne: req.sessionDoc._id } });
  res.json({ success: true, data: { revoked: true } });
}

export async function revokeSpecificSession(req, res) {
  const sessionId = req.params.sessionId;
  if (!mongoose.isValidObjectId(sessionId)) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session was not found.');
  if (String(req.sessionDoc._id) === sessionId) throw new ApiError(400, 'CURRENT_SESSION', 'Use Sign out to end your current session.');
  const result = await Session.deleteOne({ _id: sessionId, userId: req.user._id });
  if (!result.deletedCount) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session was not found.');
  res.json({ success: true, data: { revoked: true } });
}

export async function logout(req, res) {
  await revokeSession(req.sessionDoc?._id);
  clearSessionCookie(res);
  res.json({ success: true, data: { signedOut: true } });
}

export async function updateProfile(req, res) {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 100) throw new ApiError(400, 'INVALID_NAME', 'Name must be between 2 and 100 characters.');
  req.user.name = name;
  await req.user.save();
  res.json({ success: true, data: { user: safeUser(req.user) } });
}

export async function createOrganization(req, res) {
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 120) throw new ApiError(400, 'INVALID_ORGANIZATION', 'Organization name must be between 2 and 120 characters.');
  const organization = await Organization.create({ name, slug: await uniqueSlug(name) });
  try {
    await Membership.create({ organizationId: organization._id, userId: req.user._id, role: 'org_admin', status: 'active' });
    req.sessionDoc.currentOrganizationId = organization._id;
    await req.sessionDoc.save();
  } catch (error) {
    await Organization.deleteOne({ _id: organization._id });
    throw error;
  }
  res.status(201).json({
    success: true,
    data: { id: String(organization._id), name: organization.name, slug: organization.slug, role: 'org_admin' },
  });
}

export async function selectOrganization(req, res) {
  const { organizationId } = req.params;
  if (!mongoose.isValidObjectId(organizationId)) throw new ApiError(404, 'ORGANIZATION_NOT_FOUND', 'Organization was not found.');
  const membership = await Membership.findOne({
    organizationId,
    userId: req.user._id,
    status: 'active',
  }).populate({ path: 'organizationId', select: 'name slug status' });
  if (!membership || membership.organizationId?.status !== 'active') {
    throw new ApiError(403, 'ORGANIZATION_ACCESS_DENIED', 'You do not have access to this organization.');
  }
  req.sessionDoc.currentOrganizationId = membership.organizationId._id;
  await req.sessionDoc.save();
  res.json({
    success: true,
    data: {
      id: String(membership.organizationId._id),
      name: membership.organizationId.name,
      slug: membership.organizationId.slug,
      role: membership.role,
    },
  });
}


export async function updateCurrentOrganization(req, res) {
  if (req.membership?.role !== 'org_admin') throw new ApiError(403, 'ADMIN_REQUIRED', 'Only organization admins can change organization settings.');
  const name = String(req.body.name || '').trim();
  if (name.length < 2 || name.length > 120) throw new ApiError(400, 'INVALID_ORGANIZATION', 'Organization name must be between 2 and 120 characters.');
  const organization = await Organization.findOneAndUpdate(
    { _id: req.organizationId, status: 'active' },
    { $set: { name } },
    { new: true, runValidators: true },
  );
  if (!organization) throw new ApiError(404, 'ORGANIZATION_NOT_FOUND', 'Organization was not found.');
  res.json({ success: true, data: { id: String(organization._id), name: organization.name, slug: organization.slug } });
}

export async function organizationAnalytics(req, res) {
  const organizationId = req.organizationId;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, statusGroups, priorityGroups, createdLast30Days, activeMembers] = await Promise.all([
    Issue.countDocuments({ organizationId }),
    Issue.aggregate([{ $match: { organizationId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Issue.aggregate([{ $match: { organizationId } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Issue.countDocuments({ organizationId, createdAt: { $gte: since } }),
    Membership.countDocuments({ organizationId, status: 'active' }),
  ]);
  res.json({ success: true, data: {
    total,
    createdLast30Days,
    activeMembers,
    byStatus: Object.fromEntries(statusGroups.map(item => [item._id, item.count])),
    byPriority: Object.fromEntries(priorityGroups.map(item => [item._id, item.count])),
  } });
}

export async function organizationActivity(req, res) {
  const items = await ActivityLog.find({ organizationId: req.organizationId })
    .populate({ path: 'actorId', select: 'name' })
    .populate({ path: 'issueId', select: 'reference title' })
    .sort({ createdAt: -1 }).limit(100).lean();
  res.json({ success: true, data: items });
}

export async function listMembers(req, res) {
  const memberships = await Membership.find({ organizationId: req.organizationId })
    .populate({ path: 'userId', select: 'name email status' }).sort({ createdAt: 1 }).lean();
  const members = memberships.filter(item => item.userId).map(item => ({
    id: String(item._id), userId: String(item.userId._id), name: item.userId.name,
    email: item.userId.email, userStatus: item.userId.status, role: item.role,
    status: item.status, joinedAt: item.createdAt,
  }));
  res.json({ success: true, data: members });
}

export async function inviteMember(req, res) {
  if (req.membership?.role !== 'org_admin') throw new ApiError(403, 'ADMIN_REQUIRED', 'Only organization admins can manage members.');
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = String(req.body.role || 'member');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new ApiError(400, 'INVALID_EMAIL', 'Enter a valid email address.');
  if (!['member', 'handler', 'org_admin'].includes(role)) throw new ApiError(400, 'INVALID_ROLE', 'Choose member, handler, or organization admin access.');
  let invitedUser = await User.findOne({ email, status: 'active' }).select('_id email').lean();
  if (!invitedUser) {
    // Create a passwordless pending account so the recipient can sign in with Google
    // using this email address and accept the invitation. Random hash prevents password login.
    const randomPasswordHash = await hashPassword(randomBytes(48).toString('base64url'));
    try {
      invitedUser = await User.create({ name: email.split('@')[0].slice(0, 100) || 'Nivaran user', email, passwordHash: randomPasswordHash });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      invitedUser = await User.findOne({ email, status: 'active' }).select('_id email').lean();
      if (!invitedUser) throw error;
    }
    invitedUser = { _id: invitedUser._id, email: invitedUser.email };
  }
  const existing = await Membership.findOne({ organizationId: req.organizationId, userId: invitedUser._id });
  if (existing) {
    if (existing.status === 'active') throw new ApiError(409, 'ALREADY_MEMBER', 'This user is already a member of the organization.');
    existing.role = role;
    existing.status = 'invited';
    await existing.save();
    try { await sendInvitationEmail(email, req.organization?.name || 'your organization', role, existing._id); }
    catch (error) { console.error('Invitation email delivery failed:', error?.message || error); }
    return res.status(201).json({ success: true, data: { id: String(existing._id), email, role, status: existing.status } });
  }
  const membership = await Membership.create({ organizationId: req.organizationId, userId: invitedUser._id, role, status: 'invited' });
  try { await sendInvitationEmail(email, req.organization?.name || 'your organization', role, membership._id); }
  catch (error) { console.error('Invitation email delivery failed:', error?.message || error); }
  res.status(201).json({ success: true, data: { id: String(membership._id), email, role, status: membership.status } });
}

export async function acceptInvitation(req, res) {
  const membershipId = req.params.membershipId;
  if (!mongoose.isValidObjectId(membershipId)) throw new ApiError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found.');
  const membership = await Membership.findOne({ _id: membershipId, userId: req.user._id, status: 'invited' })
    .populate({ path: 'organizationId', select: 'name slug status' });
  if (!membership || membership.organizationId?.status !== 'active') throw new ApiError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found.');
  membership.status = 'active';
  await membership.save();
  req.sessionDoc.currentOrganizationId = membership.organizationId._id;
  await req.sessionDoc.save();
  res.json({ success: true, data: { id: String(membership.organizationId._id), name: membership.organizationId.name, slug: membership.organizationId.slug, role: membership.role } });
}

export async function updateMember(req, res) {
  if (req.membership?.role !== 'org_admin') throw new ApiError(403, 'ADMIN_REQUIRED', 'Only organization admins can manage members.');
  const membershipId = req.params.membershipId;
  if (!mongoose.isValidObjectId(membershipId)) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
  const member = await Membership.findOne({ _id: membershipId, organizationId: req.organizationId });
  if (!member) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
  if (String(member.userId) === String(req.user._id) && (req.body.status === 'suspended' || req.body.role !== undefined && req.body.role !== 'org_admin')) {
    throw new ApiError(400, 'CANNOT_REMOVE_SELF', 'You cannot remove your own organization administrator access.');
  }
  const wasActiveAdmin = member.role === 'org_admin' && member.status === 'active';
  if (req.body.role !== undefined) {
    if (!['member', 'handler', 'org_admin'].includes(req.body.role)) throw new ApiError(400, 'INVALID_ROLE', 'Choose a valid organization role.');
    member.role = req.body.role;
  }
  if (req.body.status !== undefined) {
    if (!['active', 'suspended'].includes(req.body.status)) throw new ApiError(400, 'INVALID_MEMBER_STATUS', 'Member status must be active or suspended.');
    member.status = req.body.status;
  }
  const isRemovingAdmin = wasActiveAdmin && (member.role !== 'org_admin' || member.status !== 'active');
  if (isRemovingAdmin) {
    const activeAdmins = await Membership.countDocuments({ organizationId: req.organizationId, role: 'org_admin', status: 'active' });
    if (activeAdmins <= 1) throw new ApiError(409, 'LAST_ORG_ADMIN', 'An organization must keep at least one active administrator.');
  }
  await member.save();
  res.json({ success: true, data: { id: String(member._id), userId: String(member.userId), role: member.role, status: member.status } });
}


export async function listMyInvitations(req, res) {
  const invitations = await Membership.find({ userId: req.user._id, status: 'invited' })
    .populate({ path: 'organizationId', select: 'name slug status' }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: invitations.filter(item => item.organizationId?.status === 'active').map(item => ({
    id: String(item._id), organizationId: String(item.organizationId._id),
    organizationName: item.organizationId.name, organizationSlug: item.organizationId.slug,
    role: item.role, invitedAt: item.createdAt,
  })) });
}
