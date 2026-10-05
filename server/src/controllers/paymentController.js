import { createHmac, timingSafeEqual } from 'node:crypto';
import { Op } from 'sequelize';
import { env } from '../config/env.js';
import { Payment, sequelize, Subscription, User } from '../models/index.js';
import {
  initializePaystackPayment,
  monthlyPrice,
  newPaymentReference,
  verifyPaystackPayment
} from '../services/paystackService.js';
import { sendPaymentConfirmation } from '../services/emailService.js';
import { serializeSubscription } from './authController.js';

function addOneCalendarMonth(value) {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}

function paymentMatches(payment, data, email) {
  return data?.status === 'success'
    && String(data.reference || '') === payment.reference
    && Number(data.amount) === Number(payment.amountMinor)
    && String(data.currency || '').toUpperCase() === payment.currency
    && String(data.customer?.email || '').trim().toLowerCase() === String(email).trim().toLowerCase();
}

async function activatePaidPayment(payment, paidAt) {
  const activation = await sequelize.transaction(async (transaction) => {
    const lockedPayment = await Payment.findByPk(payment.id, {
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (lockedPayment.status === 'success') {
      return {
        subscription: await Subscription.findOne({ where: { userId: lockedPayment.userId }, transaction }),
        receipt: null
      };
    }

    const user = await User.findByPk(lockedPayment.userId, { transaction });
    if (!user) throw new Error('The account for this payment no longer exists.');
    let subscription = await Subscription.findOne({
      where: { userId: lockedPayment.userId },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    const paidDate = paidAt && Number.isFinite(new Date(paidAt).getTime()) ? new Date(paidAt) : new Date();
    const start = subscription?.status === 'active' && subscription.endsAt > paidDate
      ? new Date(subscription.endsAt)
      : paidDate;
    const end = addOneCalendarMonth(start);

    if (!subscription) subscription = await Subscription.create({ userId: lockedPayment.userId }, { transaction });
    await subscription.update({
      status: 'active',
      startsAt: start,
      endsAt: end,
      provider: 'paystack',
      providerReference: lockedPayment.reference
    }, { transaction });
    await lockedPayment.update({ status: 'success', paidAt: paidDate }, { transaction });
    return {
      subscription,
      receipt: {
        email: user.email,
        name: user.name,
        reference: lockedPayment.reference,
        amountNgn: Number(lockedPayment.amountMinor) / 100,
        endsAt: subscription.endsAt
      }
    };
  });

  if (activation.receipt) {
    try {
      await sendPaymentConfirmation(activation.receipt);
    } catch (error) {
      console.error(`Payment confirmation email failed for ${payment.reference}:`, error.message);
    }
  }
  return activation.subscription;
}

function paymentMismatch(payment) {
  payment.update({ status: 'review' }).catch((error) => console.error('Could not flag Paystack payment for review:', error.message));
}

export function getSubscriptionPrice(_request, response) {
  if (!env.paystack.secretKey || Number(env.paystack.priceNgn) <= 0) {
    return response.json({ data: { configured: false, currency: 'NGN' } });
  }
  try {
    const price = monthlyPrice();
    return response.json({ data: { configured: true, amount: price.amountNgn, currency: price.currency } });
  } catch {
    return response.json({ data: { configured: false, currency: 'NGN' } });
  }
}

export async function createSubscriptionCheckout(request, response) {
  if (!env.paystack.secretKey) {
    return response.status(503).json({ message: 'Paystack payments are not configured yet.' });
  }
  let price;
  try {
    price = monthlyPrice();
  } catch (error) {
    return response.status(503).json({ message: error.message });
  }

  const existingSubscription = request.user.subscription;
  if (existingSubscription?.isActive()) {
    return response.status(409).json({ message: 'Your subscription is already active.' });
  }

  try {
    const recentPending = await Payment.findOne({
      where: {
        userId: request.user.id,
        status: 'pending',
        checkoutUrl: { [Op.ne]: null },
        createdAt: { [Op.gte]: new Date(Date.now() - 30 * 60 * 1000) }
      },
      order: [['createdAt', 'DESC']]
    });
    if (recentPending) {
      return response.json({ data: { authorizationUrl: recentPending.checkoutUrl, reference: recentPending.reference } });
    }

    const reference = newPaymentReference(request.user.id);
    const payment = await Payment.create({
      userId: request.user.id,
      reference,
      amountMinor: price.amountMinor,
      currency: price.currency,
      status: 'pending'
    });
    const callbackUrl = env.paystack.callbackUrl || `${env.clientUrl.replace(/\/+$/, '')}/subscription`;
    const checkout = await initializePaystackPayment({
      email: request.user.email,
      reference,
      amountMinor: price.amountMinor,
      callbackUrl,
      metadata: { userId: request.user.id, paymentId: payment.id, plan: 'pro-monthly' }
    });
    if (!checkout.authorization_url) throw new Error('Paystack did not return a checkout link.');
    await payment.update({ checkoutUrl: checkout.authorization_url });
    return response.json({ data: { authorizationUrl: checkout.authorization_url, reference } });
  } catch (error) {
    return response.status(502).json({ message: `Could not start Paystack checkout: ${error.message}` });
  }
}

export async function verifySubscriptionPayment(request, response) {
  const reference = String(request.body?.reference || '').trim();
  if (!reference) return response.status(400).json({ message: 'Paystack payment reference is required.' });

  try {
    const payment = await Payment.findOne({ where: { reference, userId: request.user.id } });
    if (!payment) return response.status(404).json({ message: 'Payment reference not found for this account.' });
    if (payment.status === 'success') {
      const subscription = await Subscription.findOne({ where: { userId: request.user.id } });
      return response.json({ data: { paymentStatus: 'success', subscription: serializeSubscription(subscription) } });
    }
    if (payment.status === 'review') {
      return response.status(409).json({ message: 'This payment is under review. Contact support before trying again.' });
    }

    const verified = await verifyPaystackPayment(reference);
    if (!paymentMatches(payment, verified, request.user.email)) {
      if (verified?.status === 'success') paymentMismatch(payment);
      else if (verified?.status === 'failed') await payment.update({ status: 'failed' });
      return response.status(202).json({
        data: { paymentStatus: verified?.status || 'pending' },
        message: verified?.status === 'success'
          ? 'Payment details could not be matched. Contact support before trying again.'
          : 'Payment is not confirmed yet. Refresh the status in a moment.'
      });
    }

    const subscription = await activatePaidPayment(payment, verified.paid_at);
    return response.json({
      data: { paymentStatus: 'success', subscription: serializeSubscription(subscription) },
      message: 'Payment confirmed. Your one-month subscription is active.'
    });
  } catch (error) {
    console.error('Paystack verification failed:', error.message);
    return response.status(502).json({ message: 'Could not verify the payment right now. Please try again.' });
  }
}

function hasValidPaystackSignature(request) {
  if (!request.rawBody || !env.paystack.secretKey) return false;
  const received = Buffer.from(String(request.headers['x-paystack-signature'] || ''), 'hex');
  const expected = createHmac('sha512', env.paystack.secretKey).update(request.rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function handlePaystackWebhook(request, response) {
  if (!hasValidPaystackSignature(request)) {
    return response.status(401).json({ message: 'Invalid Paystack signature.' });
  }

  const event = request.body;
  if (event?.event !== 'charge.success') return response.status(200).json({ received: true });
  const data = event.data;
  const reference = String(data?.reference || '');
  try {
    const payment = await Payment.findOne({
      where: { reference },
      include: [{ model: User, as: 'user' }]
    });
    if (!payment) return response.status(200).json({ received: true });
    if (payment.status === 'success') return response.status(200).json({ received: true });

    if (!paymentMatches(payment, data, payment.user.email)) {
      await payment.update({ status: 'review' });
      console.error(`Paystack payment ${reference} did not match its pending checkout.`);
      return response.status(200).json({ received: true });
    }

    await activatePaidPayment(payment, data.paid_at);
    return response.status(200).json({ received: true });
  } catch (error) {
    console.error('Paystack webhook processing failed:', error.message);
    return response.status(500).json({ message: 'Unable to process Paystack event.' });
  }
}
