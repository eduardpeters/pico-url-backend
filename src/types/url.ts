import type { urls } from '../db/schema.js';

export type UrlSelect = typeof urls.$inferSelect;
export type UrlInsert = typeof urls.$inferInsert;
