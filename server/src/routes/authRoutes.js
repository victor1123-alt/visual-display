import { Router } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { getCurrentAccount, login, logout, register } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

function accountKey(request) {
  const email = String(request.body?.email || 'unknown').trim().toLowerCase();
  return `${ipKeyGenerator(request.ip)}:${email}`;
}

function wasSuccessfulOrServerFailure(_request, response) {
  return response.statusCode < 400 || response.statusCode >= 500;
}

function rateLimitHandler(request, response) {
  const resetTime = request.rateLimit?.resetTime?.getTime?.();
  const retryAfterSeconds = resetTime ? Math.max(1, Math.ceil((resetTime - Date.now()) / 1000)) : undefined;
  return response.status(429).json({
    message: retryAfterSeconds
      ? `Too many attempts for this account. Try again in ${Math.ceil(retryAfterSeconds / 60)} minute(s).`
      : 'Too many attempts for this account. Try again later.',
    retryAfterSeconds
  });
}

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  keyGenerator: accountKey,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  requestWasSuccessful: wasSuccessfulOrServerFailure,
  handler: rateLimitHandler
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: accountKey,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  requestWasSuccessful: wasSuccessfulOrServerFailure,
  handler: rateLimitHandler
});

router.post('/register', registrationLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticate, getCurrentAccount);

export default router;
