import { eq } from 'drizzle-orm';
import { db } from '../db/connect.js';
import { users } from '../db/schema.js';
import type { UserInsert, UserPublic, UserSelect, UpdatedUser } from '../types/user.js';

class usersManager {
    static async getByEmail(email: string): Promise<UserSelect | undefined> {
        const results = await db.select().from(users).where(eq(users.email, email));
        return results[0];
    }

    static async getById(id: string): Promise<UserPublic | undefined> {
        const results = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                created: users.created,
            })
            .from(users)
            .where(eq(users.id, id));
        return results[0];
    }

    static async createUser(newUser: UserInsert): Promise<UserPublic> {
        const results = await db.insert(users).values(newUser).returning({
            id: users.id,
            name: users.name,
            email: users.email,
            created: users.created,
        });
        return results[0];
    }

    static async updateUser(id: string, updatedUser: UpdatedUser): Promise<UserPublic | undefined> {
        const results = await db
            .update(users)
            .set(updatedUser)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                created: users.created,
            });
        return results[0];
    }

    static async deleteUser(id: string): Promise<void> {
        await db.delete(users).where(eq(users.id, id));
    }
}

export default usersManager;
