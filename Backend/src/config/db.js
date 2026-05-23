import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL WARNING: DATABASE_URL is not set. Please populate .env file.');
}

// For Supabase connection, standard SSL configuration requires SSL option.
// Using ssl: { rejectUnauthorized: false } allows connection without validation issues locally.
const client = connectionString ? postgres(connectionString, { ssl: { rejectUnauthorized: false } }) : null;
export const db = client ? drizzle(client) : null;
