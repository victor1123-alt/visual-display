import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

const API_BASE = 'https://api.paystack.co';

function requirePaystackConfig() {
  if (!env.paystack.secretKey) throw new Error('Paystack is not configured. Set PAYSTACK_SECRET_KEY.');
}

export function monthlyPrice() {
  const priceNgn = Number(env.paystack.priceNgn);
  if (!Number.isFinite(priceNgn) || priceNgn <= 0) {
    throw new Error('Monthly subscription price is not configured. Set PAYSTACK_PRICE_NGN.');
  }
  const amountMinor = Math.round(priceNgn * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('PAYSTACK_PRICE_NGN must be a valid amount in Naira.');
  }
  return { amountNgn: amountMinor / 100, amountMinor, currency: 'NGN' };
}

export function newPaymentReference(userId) {
  return `vd-${userId}-${randomBytes(16).toString('hex')}`;
}

async function paystackRequest(path, options = {}) {
  requirePaystackConfig();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${env.paystack.secretKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Paystack returned an unreadable response.');
  }
  if (!response.ok || payload.status !== true) {
    throw new Error(payload.message || 'Paystack request failed.');
  }
  return payload.data;
}

export function initializePaystackPayment({ email, reference, amountMinor, callbackUrl, metadata }) {
  return paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email,
      amount: String(amountMinor),
      currency: 'NGN',
      reference,
      callback_url: callbackUrl,
      metadata: JSON.stringify(metadata)
    })
  });
}

export function verifyPaystackPayment(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}
