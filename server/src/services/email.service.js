import { env } from '../config/env.js';

export async function sendEmail({ to, subject, text, html }) {
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const secret = process.env.GOOGLE_SCRIPT_SECRET;

  if (!scriptUrl || !secret) {
    if (env.nodeEnv === 'production') {
      throw new Error('Google email service is not configured.');
    }

    console.info(
      `[Nivaran email preview] To: ${to}\nSubject: ${subject}\n${text}`
    );
    return { preview: true };
  }

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret,
      to,
      subject,
      text,
      html: html || text,
    }),
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`Google email service returned HTTP ${response.status}.`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Google email delivery failed.');
  }

  return result;
}

export async function sendPasswordResetEmail(email, url) {
  return sendEmail({
    to: email,
    subject: 'Reset your Nivaran password',
    text: `We received a request to reset your Nivaran password. This link expires in 30 minutes and can be used once:\n\n${url}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>We received a request to reset your Nivaran password.</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>This link expires in 30 minutes and can be used once. If you did not request this, you can ignore this email.</p>`,
  });
}

export async function sendInvitationEmail(
  email,
  organizationName,
  role,
  invitationId
) {
  const url = `${env.clientUrl.replace(/\/$/, '')}/`;

  return sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName} on Nivaran`,
    text: `You have been invited to join ${organizationName} on Nivaran as a ${role}. Sign in to your Nivaran account, open Members, and review your pending invitations: ${url}`,
    html: `<p>You have been invited to join <strong>${escapeHtml(organizationName)}</strong> on Nivaran as a ${escapeHtml(role)}.</p><p><a href="${escapeHtml(url)}">Sign in to Nivaran, then open Members to review invitations</a></p>`,
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character =>
    ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]
  );
}