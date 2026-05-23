import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(), // stored in plain text per requirements
  role: text('role').default('user').notNull(), // either "user" or "admin"
  otp: text('otp'),
  otpExpiry: timestamp('otp_expiry'),
  isVerified: boolean('is_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const complaints = pgTable('complaints', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  complaintText: text('complaint_text').notNull(),
  aiQuestion: text('ai_question').notNull(),
  userAnswer: text('user_answer').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
