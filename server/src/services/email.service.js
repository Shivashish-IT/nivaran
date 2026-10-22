import { Resend } from 'resend';
import { env } from '../config/env.js';

let resend;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    if (env.nodeEnv === 'production') {
      throw new Error('Resend email delivery is not configured.');
    }
    return null;
  }

  if (!resend) resend = new Resend(apiKey);
  return resend;
}

export async function sendEmail({ to, subject, text, html }) {
  const client = getResend();

  if (!client) {
    console.info(
      `[Nivaran email preview] To: ${to}\nSubject: ${subject}\n${text}`
    );
    return { preview: true };
  }

  const from =
    process.env.RESEND_FROM || 'Nivaran <onboarding@resend.dev>';

  const { data, error } = await client.emails.send({
    from,
    to,
    subject,
    text,
    html,
  });

  if (error) {
    console.error('Resend email delivery failed:', error);
    throw new Error(`Resend email delivery failed: ${error.message}`);
  }

  return data;
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
