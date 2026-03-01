import type { users } from '../db/schema.js';

export type UserSelect = typeof users.$inferSelect;
export type UserPublic = Omit<UserSelect, 'hashedPassword'>;
export type UserInsert = typeof users.$inferInsert;
export type UpdatedUser = Partial<Pick<UserInsert, 'name' | 'email' | 'hashedPassword'>>;
