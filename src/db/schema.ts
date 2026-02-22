import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    hashedPassword: varchar('hashed_password', { length: 1024 }).notNull(),
    created: timestamp('created').defaultNow(),
});

export const urls = pgTable('urls', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    original: text('original').notNull().unique(),
    short: varchar('short', { length: 10 }).notNull().unique(),
    visits: integer('visits').notNull().default(0),
    created: timestamp('created').defaultNow(),
});
