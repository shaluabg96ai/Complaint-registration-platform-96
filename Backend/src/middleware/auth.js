import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_complaints_token_key_123';

/**
 * Authentication middleware that verifies the JWT token present in the request cookie.
 */
export async function requireAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // If database connection is not initialized, run in development offline fallback
    if (!db) {
      console.warn('[AUTH MIDDLEWARE] Offline DB Fallback. Authenticating decoded JWT: ', decoded);
      req.user = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role || 'user',
      };
      return next();
    }

    // Query user in PostgreSQL
    const foundUsers = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);

    if (foundUsers.length === 0) {
      res.clearCookie('token');
      return res.status(401).json({ error: 'Session user no longer exists. Please log in again.' });
    }

    const user = foundUsers[0];

    if (!user.isVerified) {
      return res.status(403).json({ error: 'Account has not been verified via OTP.' });
    }

    // Embed verified user onto request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('[AUTH MIDDLEWARE ERROR] JWT verification failed:', error.message);
    res.clearCookie('token');
    return res.status(401).json({ error: 'Your session has expired or is invalid. Please log in again.' });
  }
}

/**
 * Admin role enforcement middleware. Assumes requireAuth is executed first.
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges are required to view this page.' });
  }

  next();
}
