import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('CRITICAL: DATABASE_URL is missing. Cannot run migrations.');
  process.exit(1);
}

const migrationClient = postgres(databaseUrl, { max: 1, ssl: { rejectUnauthorized: false } });
const db = drizzle(migrationClient);

async function main() {
  console.log('Starting Drizzle database migration...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Database migration completed successfully!');
  } catch (err) {
    console.error('Database migration failed:', err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main();
