import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const PASSWORD_ROUNDS = 12;

function requireJwtSecret() {
  if (!env.auth.jwtSecret) throw new Error('JWT_SECRET is not configured');
  return env.auth.jwtSecret;
}

export function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function createAccessToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email, role: user.role },
    requireJwtSecret(),
    { expiresIn: env.auth.jwtExpiresIn, issuer: 'visualdisplay' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, requireJwtSecret(), { issuer: 'visualdisplay' });
}
