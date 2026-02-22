import { eq, count, sql } from 'drizzle-orm';
import { db } from '../db/connect.js';
import { urls } from '../db/schema.js';
import type { UrlSelect, UrlInsert } from '../types/url.js';

interface NewUrlInput {
    userId: string;
    original: string;
    short: string;
}

class urlsManager {
    static async getAllByUser(userId: string): Promise<UrlSelect[]> {
        return await db.select().from(urls).where(eq(urls.userId, userId));
    }

    static async getByShortUrl(short: string): Promise<UrlSelect | undefined> {
        const results = await db.select().from(urls).where(eq(urls.short, short));
        return results[0];
    }

    static async getByOriginalUrl(original: string): Promise<UrlSelect | undefined> {
        const results = await db.select().from(urls).where(eq(urls.original, original));
        return results[0];
    }

    static async getByShortUrlAndIncreaseVisits(short: string, amount = 1): Promise<UrlSelect | undefined> {
        const results = await db
            .update(urls)
            .set({ visits: sql`${urls.visits} + ${amount}` })
            .where(eq(urls.short, short))
            .returning();
        return results[0];
    }

    static async getCount(userId: string): Promise<number> {
        const results = await db.select({ count: count() }).from(urls).where(eq(urls.userId, userId));
        return results[0].count;
    }

    static async createUrl(newUrl: NewUrlInput): Promise<UrlSelect> {
        const results = await db.insert(urls).values(newUrl).returning();
        return results[0];
    }

    static async updateUrl(id: string, newOriginal: string): Promise<UrlSelect | undefined> {
        const results = await db
            .update(urls)
            .set({ original: newOriginal })
            .where(eq(urls.id, id))
            .returning();
        return results[0];
    }

    static async deleteByShortUrl(short: string): Promise<void> {
        await db.delete(urls).where(eq(urls.short, short));
    }
}

export default urlsManager;
