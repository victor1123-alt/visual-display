import { Subscription, User } from '../models/index.js';
import { serializeSubscription } from './authController.js';

export function getSubscription(request, response) {
  return response.json({ data: serializeSubscription(request.user.subscription) });
}

export async function listSubscriptions(_request, response, next) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'createdAt'],
      include: [{ model: Subscription, as: 'subscription' }],
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    return response.json({ data: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      subscription: serializeSubscription(user.subscription)
    })) });
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
