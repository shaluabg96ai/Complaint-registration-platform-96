import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../config/db.js';
import { users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { sendOtpEmail } from '../services/email.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_complaints_token_key_123';

// In-Memory fallback database for offline development/testing
export const mockUsers = [];

/**
 * Helper to generate a random 6-digit numeric OTP
 */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Controller: POST /api/auth/send-otp
 */
export async function sendOtp(req, res) {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const otp = generateOtp();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  try {
    if (!db) {
      // In-Memory offline fallback logic
      console.log('[AUTH CONTROLLER] Operating in Offline Mock Database mode.');
      const existingUser = mockUsers.find((u) => u.email === normalizedEmail);

      if (existingUser) {
        if (existingUser.isVerified) {
          return res.status(400).json({ error: 'An account with this email is already registered. Please log in.' });
        }
        // Update unverified user OTP details
        existingUser.name = name;
        existingUser.otp = otp;
        existingUser.otpExpiry = otpExpiry;
      } else {
        // Create new unverified user record
        mockUsers.push({
          id: crypto.randomUUID(),
          name,
          email: normalizedEmail,
          password: '',
          role: 'user', // Default role
          otp,
          otpExpiry,
          isVerified: false,
          createdAt: new Date(),
        });
      }

      await sendOtpEmail(normalizedEmail, otp, name);
      return res.status(200).json({ message: 'A 6-digit verification code has been sent to your email.' });
    }

    // Supabase Drizzle mode
    // 1. Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      if (user.isVerified) {
        return res.status(400).json({ error: 'An account with this email is already registered. Please log in.' });
      }

      // Update existing unverified user record with new OTP
      await db
        .update(users)
        .set({
          name,
          otp,
          otpExpiry,
        })
        .where(eq(users.id, user.id));
    } else {
      // Insert new unverified user record
      await db.insert(users).values({
        name,
        email: normalizedEmail,
        password: 'unregistered_temp', // Placeholder
        otp,
        otpExpiry,
        isVerified: false,
      });
    }

    // Send OTP email
    await sendOtpEmail(normalizedEmail, otp, name);
    res.status(200).json({ message: 'A 6-digit verification code has been sent to your email.' });
  } catch (error) {
    console.error('Error in send-otp:', error);
    res.status(500).json({ error: 'Failed to request OTP. Please try again later.' });
  }
}

/**
 * Controller: POST /api/auth/register
 */
export async function register(req, res) {
  const { email, otp, password } = req.body;

  if (!email || !otp || !password) {
    return res.status(400).json({ error: 'Email, OTP, and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    if (!db) {
      // In-Memory offline fallback logic
      const user = mockUsers.find((u) => u.email === normalizedEmail);

      if (!user) {
        return res.status(400).json({ error: 'Registration session not found. Please request OTP first.' });
      }

      if (user.otp !== otp.trim()) {
        return res.status(400).json({ error: 'Invalid verification code.' });
      }

      if (new Date() > new Date(user.otpExpiry)) {
        return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      }

      // Mark user as verified and save plain text password
      user.isVerified = true;
      user.password = password; // plain text as requested
      user.otp = null;
      user.otpExpiry = null;

      console.log(`[AUTH CONTROLLER] Registered user: ${user.name} (${user.email}) successfully! (Offline DB)`);
      return res.status(200).json({ message: 'Registration successful! You can now log in.' });
    }

    // Supabase Drizzle mode
    const existingUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existingUsers.length === 0) {
      return res.status(400).json({ error: 'Registration session not found. Please request OTP first.' });
    }

    const user = existingUsers[0];

    if (user.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Set verified, save plain text password, clear OTP
    await db
      .update(users)
      .set({
        isVerified: true,
        password: password, // plain text as requested
        otp: null,
        otpExpiry: null,
      })
      .where(eq(users.id, user.id));

    res.status(200).json({ message: 'Registration successful! You can now log in.' });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ error: 'Failed to complete registration.' });
  }
}

/**
 * Controller: POST /api/auth/login
 */
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    let user = null;

    if (!db) {
      // In-Memory offline fallback logic
      user = mockUsers.find((u) => u.email === normalizedEmail);
    } else {
      // Supabase Drizzle mode
      const result = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (result.length > 0) {
        user = result[0];
      }
    }

    if (!user || !user.isVerified) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Simple plain text password matching as requested
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create JWT Session Token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // According to instructions:
    // "The cookie must not be HttpOnly, not Secure, and not SameSite Strict (kept this way for easier local testing)"
    res.cookie('token', token, {
      httpOnly: false, // NOT HttpOnly
      secure: false, // NOT Secure
      sameSite: 'lax', // NOT SameSite Strict
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    res.status(200).json({
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Login attempt failed.' });
  }
}

/**
 * Controller: POST /api/auth/logout
 */
export function logout(req, res) {
  res.clearCookie('token');
  res.status(200).json({ message: 'Logged out successfully.' });
}

/**
 * Controller: GET /api/auth/me
 */
export function getMe(req, res) {
  // Verified user is added to req.user by requireAuth middleware
  res.status(200).json(req.user);
}
