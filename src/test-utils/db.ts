import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Dedicated client for test lifecycle management — isolated from the app's connect.ts singleton
let client: ReturnType<typeof postgres>;

export async function setupTestDb(): Promise<void> {
    client = postgres(process.env.DATABASE_URL as string);
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: './drizzle' });
}

export async function teardownTestDb(): Promise<void> {
    await client.end();
}

export async function truncateTables(): Promise<void> {
    await client`TRUNCATE users CASCADE`;
}
