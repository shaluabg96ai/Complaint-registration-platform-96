import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

let transporter = null;

if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
} else {
  console.warn(
    'WARNING: EMAIL_USER and EMAIL_PASS are not set. The platform will run in offline email mode (OTPs will only be printed in the server logs).'
  );
}

/**
 * Sends a registration OTP to the specified user email.
 * @param {string} email - Destination email address
 * @param {string} otpCode - 6-digit OTP code
 * @param {string} userName - Name of the registering user
 * @returns {Promise<boolean>}
 */
export async function sendOtpEmail(email, otpCode, userName) {
  console.log(`[EMAIL SIMULATOR] Generated OTP for ${userName} (${email}): [ ${otpCode} ]`);

  if (!transporter) {
    console.log(`[EMAIL SIMULATOR] Nodemailer not configured. Please use the simulated OTP above to register.`);
    return true;
  }

  const mailOptions = {
    from: `"Complaints Registration Platform" <${emailUser}>`,
    to: email,
    subject: 'Your Account Verification Code',
    text: `Hello ${userName},

Thank you for registering on our Complaints Registration Platform.

Your 6-digit verification code (OTP) is: ${otpCode}

This code will expire in 10 minutes. If you did not request this, you can safely ignore this email.

Best regards,
Complaints Registration Platform Team`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Nodemailer] Email successfully sent to ${email}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[Nodemailer ERROR] Failed to send email to ${email}:`, error);
    console.warn(`[Nodemailer FALLBACK] Please use the console-printed OTP [ ${otpCode} ] to verify registration.`);
    return true; // Return true so registration can still proceed via developer fallback
  }
}
