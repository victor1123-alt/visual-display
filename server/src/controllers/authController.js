import { env } from '../config/env.js';
import { sequelize, Subscription, User } from '../models/index.js';
import { createAccessToken, hashPassword, verifyPassword } from '../services/authService.js';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function serializeSubscription(subscription) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    plan: subscription.plan,
    status: subscription.isActive() ? 'active' : subscription.status === 'active' ? 'expired' : subscription.status,
    requestedAt: subscription.requestedAt,
    startsAt: subscription.startsAt,
    endsAt: subscription.endsAt,
    active: subscription.isActive()
  };
}

function sessionPayload(user, subscription = user.subscription) {
  return {
    user: user.toSafeJSON(),
    subscription: serializeSubscription(subscription)
  };
}

function setSessionCookie(response, user) {
  const secure = env.nodeEnv === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `visualdisplay_session=${encodeURIComponent(createAccessToken(user))}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure}`);
}

export async function register(request, response, next) {
  if (!env.dbEnabled) return response.status(503).json({ message: 'Registration is unavailable because the MySQL database is not connected.' });
  const name = String(request.body.name || '').trim();
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password || '');

  if (name.length < 2) return response.status(400).json({ message: 'Name must be at least 2 characters.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response.status(400).json({ message: 'Enter a valid email address.' });
  if (password.length < 8) return response.status(400).json({ message: 'Password must be at least 8 characters.' });

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return response.status(409).json({ message: 'An account already exists for this email.' });

    const result = await sequelize.transaction(async (transaction) => {
      const user = await User.create({ name, email, passwordHash: await hashPassword(password) }, { transaction });
      const subscription = await Subscription.create({ userId: user.id, status: 'pending' }, { transaction });
      return { user, subscription };
    });

    setSessionCookie(response, result.user);
    return response.status(201).json({ data: sessionPayload(result.user, result.subscription) });
  } catch (error) {
    return next(error);
  }
}

export async function login(request, response, next) {
  if (!env.dbEnabled) return response.status(503).json({ message: 'Login is unavailable because the MySQL database is not connected.' });
  const email = normalizeEmail(request.body.email);
  const password = String(request.body.password || '');

  try {
    const user = await User.scope('withPassword').findOne({
      where: { email },
      include: [{ model: Subscription, as: 'subscription' }]
    });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }
    setSessionCookie(response, user);
    return response.json({ data: sessionPayload(user) });
  } catch (error) {
    return next(error);
  }
}

export function getCurrentAccount(request, response) {
  return response.json({
    data: {
      user: request.user.toSafeJSON(),
      subscription: serializeSubscription(request.user.subscription)
    }
  });
}

export function logout(_request, response) {
  const secure = env.nodeEnv === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `visualdisplay_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  return response.status(204).end();
}

export { serializeSubscription };
