import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transport;
function getTransport() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.mailFrom) return null;
  if (!transport) transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  return transport;
}

export async function sendEmail({ to, subject, text, html }) {
  const sender = getTransport();
  if (!sender) {
    if (env.nodeEnv === 'production') throw new Error('Email delivery is not configured.');
    console.info(`[Nivaran email preview] To: ${to}\nSubject: ${subject}\n${text}`);
    return { preview: true };
  }
  return sender.sendMail({ from: env.mailFrom, to, subject, text, html });
}

export async function sendPasswordResetEmail(email, url) {
  return sendEmail({
    to: email,
    subject: 'Reset your Nivaran password',
    text: `We received a request to reset your Nivaran password. This link expires in 30 minutes and can be used once:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>We received a request to reset your Nivaran password.</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>This link expires in 30 minutes and can be used once. If you did not request this, you can ignore this email.</p>`,
  });
}

export async function sendInvitationEmail(email, organizationName, role, invitationId) {
  const url = `${env.clientUrl.replace(/\/$/, '')}/`; 
  return sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName} on Nivaran`,
    text: `You have been invited to join ${organizationName} on Nivaran as a ${role}. Sign in to your Nivaran account, open Members, and review your pending invitations: ${url}`,
    html: `<p>You have been invited to join <strong>${escapeHtml(organizationName)}</strong> on Nivaran as a ${escapeHtml(role)}.</p><p><a href="${escapeHtml(url)}">Sign in to Nivaran, then open Members to review invitations</a></p>`,
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
