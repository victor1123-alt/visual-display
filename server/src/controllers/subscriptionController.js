import { Op } from 'sequelize';
import { Subscription, User } from '../models/index.js';
import { serializeSubscription } from './authController.js';

export function getSubscription(request, response) {
  return response.json({ data: serializeSubscription(request.user.subscription) });
}

export async function requestSubscription(request, response, next) {
  try {
    const [subscription] = await Subscription.findOrCreate({
      where: { userId: request.user.id },
      defaults: { status: 'pending', requestedAt: new Date() }
    });

    if (!subscription.isActive()) {
      await subscription.update({ status: 'pending', requestedAt: new Date(), startsAt: null, endsAt: null });
    }
    return response.status(subscription.isActive() ? 200 : 202).json({
      data: serializeSubscription(subscription),
      message: subscription.isActive() ? 'Subscription is already active.' : 'Subscription request received and awaiting activation.'
    });
  } catch (error) {
    return next(error);
  }
}

export async function activateSubscription(request, response, next) {
  const email = String(request.body.email || '').trim().toLowerCase();
  const durationDays = Math.min(Math.max(Number(request.body.durationDays) || 30, 1), 365);
  if (!email) return response.status(400).json({ message: 'Account email is required.' });

  try {
    const user = await User.findOne({
      where: { email: { [Op.eq]: email } },
      include: [{ model: Subscription, as: 'subscription' }]
    });
    if (!user) return response.status(404).json({ message: 'No valid account exists for this email.' });

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const subscription = user.subscription || await Subscription.create({ userId: user.id });
    await subscription.update({
      status: 'active',
      startsAt,
      endsAt,
      provider: 'manual',
      providerReference: String(request.body.reference || '').trim() || null
    });

    return response.json({
      data: { user: user.toSafeJSON(), subscription: serializeSubscription(subscription) },
      message: `Subscription activated for ${durationDays} days.`
    });
  } catch (error) {
    return next(error);
  }
}

export async function cancelSubscription(request, response, next) {
  const email = String(request.body.email || '').trim().toLowerCase();
  if (!email) return response.status(400).json({ message: 'Account email is required.' });
  try {
    const user = await User.findOne({ where: { email }, include: [{ model: Subscription, as: 'subscription' }] });
    if (!user?.subscription) return response.status(404).json({ message: 'Subscription not found.' });
    await user.subscription.update({ status: 'canceled', endsAt: new Date() });
    return response.json({ data: serializeSubscription(user.subscription), message: 'Subscription canceled.' });
  } catch (error) {
    return next(error);
  }
}
