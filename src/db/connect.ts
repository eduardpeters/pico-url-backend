import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from './schema.js';

const client = postgres(process.env.DATABASE_URL as string);
export const db = drizzle(client, { schema });

export async function connectToDatabase() {
    await client`SELECT 1`;
    console.log('Postgres connection established!');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations applied!');
}
