import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hospitalos-default-secret-key-12345';

/**
 * Hash a plain text password using PBKDF2 with SHA-512.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a plain text password against a stored PBKDF2 hash.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a JWT token containing user details.
 */
export function generateToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

/**
 * Verify a JWT token and return decoded payload.
 */
export function verifyToken(token: string): any {
  return jwt.verify(token, JWT_SECRET);
}
