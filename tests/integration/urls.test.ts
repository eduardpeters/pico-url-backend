import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import usersManager from '../../src/managers/usersManager.js';
import { setupTestDb, teardownTestDb, truncateTables } from '../../src/test-utils/db.js';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
afterEach(async () => { await truncateTables(); });

async function createTestUser(email = 'test@example.com', password = 'password123') {
    const hashedPassword = await bcrypt.hash(password, 10);
    return usersManager.createUser({ name: 'Test User', email, hashedPassword });
}

async function loginTestUser(email: string, password: string): Promise<string> {
    const res = await request(app).post('/api/auth').send({ email, password });
    return res.body.token as string;
}

describe('POST /api/urls — create shortened URL', () => {
    it('creates a new URL and returns 201 with shortUrl', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const res = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/some/long/path' });

        expect(res.status).toBe(201);
        expect(typeof res.body.shortUrl).toBe('string');
        expect(res.body.shortUrl).toContain(process.env.URL_BASE);
    });

    it('is idempotent — returns 200 with existing shortUrl on duplicate', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const first = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/idempotent' });
        expect(first.status).toBe(201);

        const second = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/idempotent' });
        expect(second.status).toBe(200);
        expect(second.body.shortUrl).toBe(first.body.shortUrl);
    });

    it('returns 400 for an invalid URL', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const res = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'not-a-valid-url' });

        expect(res.status).toBe(400);
    });

    it('returns 401 with no token', async () => {
        const res = await request(app)
            .post('/api/urls')
            .send({ url: 'https://example.com' });

        expect(res.status).toBe(401);
    });
});

describe('GET /api/urls — list all URLs for user', () => {
    it('returns 200 with array of URLs including full short URLs', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/first' });
        await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/second' });

        const res = await request(app)
            .get('/api/urls')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
        res.body.forEach((entry: { short: string }) => {
            expect(entry.short).toContain(process.env.URL_BASE);
        });
    });

    it('returns 200 with empty array when user has no URLs', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const res = await request(app)
            .get('/api/urls')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns 401 with no token', async () => {
        const res = await request(app).get('/api/urls');
        expect(res.status).toBe(401);
    });
});

describe('GET /api/urls/count — URL count for user', () => {
    it('returns 200 with correct count', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/count-test' });

        const res = await request(app)
            .get('/api/urls/count')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
    });

    it('returns 0 when user has no URLs', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const res = await request(app)
            .get('/api/urls/count')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(0);
    });
});

describe('GET /api/urls/:shorturl — resolve and increment visits', () => {
    it('returns 200 with originalUrl and increments visits', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/visit-test' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        const res1 = await request(app).get(`/api/urls/${short}`);
        expect(res1.status).toBe(200);
        expect(res1.body.originalUrl).toBe('https://example.com/visit-test');

        // Second call should still work and visits should have incremented (verify via info endpoint)
        await request(app).get(`/api/urls/${short}`);
        const infoRes = await request(app)
            .get(`/api/urls/info/${short}`)
            .set('Authorization', `Bearer ${token}`);
        expect(infoRes.body.visits).toBe(2);
    });

    it('returns 404 for unknown short code', async () => {
        const res = await request(app).get('/api/urls/unknown12x');
        expect(res.status).toBe(404);
    });

    it('returns 400 for short code with wrong length', async () => {
        const res = await request(app).get('/api/urls/short');
        expect(res.status).toBe(400);
    });
});

describe('GET /api/urls/info/:shorturl — get URL details (authenticated)', () => {
    it('returns 200 with full URL entry for owner', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/info-test' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        const res = await request(app)
            .get(`/api/urls/info/${short}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.original).toBe('https://example.com/info-test');
        expect(res.body.visits).toBe(0);
    });

    it('returns 401 when requesting another user\'s URL', async () => {
        // User A creates a URL
        await createTestUser('usera@example.com');
        const tokenA = await loginTestUser('usera@example.com', 'password123');
        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ url: 'https://example.com/userA-url' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        // User B tries to access it
        await createTestUser('userb@example.com');
        const tokenB = await loginTestUser('userb@example.com', 'password123');
        const res = await request(app)
            .get(`/api/urls/info/${short}`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.status).toBe(401);
    });

    it('returns 404 for unknown short code', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const res = await request(app)
            .get('/api/urls/info/unknown12x')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/urls/:shorturl — update original URL', () => {
    it('returns 200 with updated URL entry', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/before-update' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        const res = await request(app)
            .patch(`/api/urls/${short}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/after-update' });

        expect(res.status).toBe(200);
        expect(res.body.original).toBe('https://example.com/after-update');
    });

    it('returns 401 when trying to update another user\'s URL', async () => {
        await createTestUser('owner@example.com');
        const ownerToken = await loginTestUser('owner@example.com', 'password123');
        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ url: 'https://example.com/owners-url' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        await createTestUser('attacker@example.com');
        const attackerToken = await loginTestUser('attacker@example.com', 'password123');
        const res = await request(app)
            .patch(`/api/urls/${short}`)
            .set('Authorization', `Bearer ${attackerToken}`)
            .send({ url: 'https://example.com/hijacked' });

        expect(res.status).toBe(401);
    });

    it('returns 400 for invalid URL body', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/valid' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        const res = await request(app)
            .patch(`/api/urls/${short}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'not-a-valid-url' });

        expect(res.status).toBe(400);
    });

    it('returns 404 for unknown short code', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const res = await request(app)
            .patch('/api/urls/unknown123x')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/new' });

        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/urls/:shorturl — delete URL', () => {
    it('returns 204 and URL is no longer accessible', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://example.com/to-delete' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        const deleteRes = await request(app)
            .delete(`/api/urls/${short}`)
            .set('Authorization', `Bearer ${token}`);
        expect(deleteRes.status).toBe(204);

        const getRes = await request(app).get(`/api/urls/${short}`);
        expect(getRes.status).toBe(404);
    });

    it('is idempotent — returns 204 even when URL does not exist', async () => {
        await createTestUser();
        const token = await loginTestUser('test@example.com', 'password123');

        const res = await request(app)
            .delete('/api/urls/notexists0')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(204);
    });

    it('returns 401 when trying to delete another user\'s URL', async () => {
        await createTestUser('owner@example.com');
        const ownerToken = await loginTestUser('owner@example.com', 'password123');
        const createRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ url: 'https://example.com/owners-url' });
        const short = (createRes.body.shortUrl as string).split('/').pop() as string;

        await createTestUser('attacker@example.com');
        const attackerToken = await loginTestUser('attacker@example.com', 'password123');
        const res = await request(app)
            .delete(`/api/urls/${short}`)
            .set('Authorization', `Bearer ${attackerToken}`);

        expect(res.status).toBe(401);
    });

    it('returns 401 with no token', async () => {
        const res = await request(app).delete('/api/urls/someshortxx');
        expect(res.status).toBe(401);
    });
});
