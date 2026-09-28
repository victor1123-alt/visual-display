import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { Subscription, User } from '../models/index.js';
import { verifyAccessToken } from '../services/authService.js';

export function accessTokenFromRequest(request) {
  const [scheme, token] = String(request.headers.authorization || '').split(' ');
  if (scheme?.toLowerCase() === 'bearer' && token) return token;
  const cookie = String(request.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('visualdisplay_session='));
  return cookie ? decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1)) : null;
}

export async function authenticate(request, response, next) {
  if (!env.dbEnabled) return response.status(503).json({ message: 'Account access is unavailable because the MySQL database is not connected.' });
  const token = accessTokenFromRequest(request);
  if (!token) return response.status(401).json({ message: 'Authentication required.' });

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.sub, { include: [{ model: Subscription, as: 'subscription' }] });
    if (!user) return response.status(401).json({ message: 'Account no longer exists.' });
    request.user = user;
    return next();
  } catch {
    return response.status(401).json({ message: 'Invalid or expired access token.' });
  }
}

export function requireActiveSubscription(request, response, next) {
  if (!request.user?.subscription?.isActive()) {
    return response.status(403).json({
      message: 'An active subscription is required.',
      code: 'SUBSCRIPTION_REQUIRED',
      subscription: request.user?.subscription || null
    });
  }
  return next();
}

export function requireAdminApiKey(request, response, next) {
  if (!env.dbEnabled) return response.status(503).json({ message: 'Subscription management requires the database.' });
  const supplied = String(request.headers['x-admin-key'] || '');
  const expected = String(env.auth.adminApiKey || '');
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (!expected || suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return response.status(401).json({ message: 'Valid administrator key required.' });
  }
  return next();
}

export function protectedAccess(request, response, next) {
  return authenticate(request, response, () => requireActiveSubscription(request, response, next));
}

export async function authenticateSubscribedToken(token) {
  if (!env.dbEnabled || !token) return null;
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findByPk(payload.sub, { include: [{ model: Subscription, as: 'subscription' }] });
    return user?.subscription?.isActive() ? user : null;
  } catch {
    return null;
  }
}
