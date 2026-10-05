import { env } from '../config/env.js';

export async function sendPaymentConfirmation({ email, name, reference, amountNgn, endsAt }) {
  if (!env.email.resendApiKey || !env.email.from) {
    console.warn('Payment confirmation email skipped: set RESEND_API_KEY and EMAIL_FROM.');
    return false;
  }

  const amount = new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN'
  }).format(amountNgn);
  const expiry = new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'long', timeZone: 'Africa/Lagos'
  }).format(new Date(endsAt));
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const text = `${greeting}\n\nWe received your payment of ${amount} for VisualDisplay Pro. Your subscription is active until ${expiry}.\n\nPayment reference: ${reference}\n\nYour subscription does not renew automatically.\n\nVisualDisplay`;
  const html = `<p>${escapeHtml(greeting)}</p><p>We received your payment of <strong>${escapeHtml(amount)}</strong> for VisualDisplay Pro. Your subscription is active until <strong>${escapeHtml(expiry)}</strong>.</p><p>Payment reference: <code>${escapeHtml(reference)}</code></p><p>Your subscription does not renew automatically.</p><p>VisualDisplay</p>`;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: {
      Authorization: `Bearer ${env.email.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.email.from,
      to: [email],
      subject: 'Your VisualDisplay subscription is active',
      text,
      html
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend email request failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }
  return true;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
