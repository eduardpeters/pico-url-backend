import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import usersManager from '../../src/managers/usersManager.js';
import { setupTestDb, teardownTestDb, truncateTables } from '../../src/test-utils/db.js';

beforeAll(async () => { await setupTestDb(); });
afterAll(async () => { await teardownTestDb(); });
afterEach(async () => { await truncateTables(); });

async function createTestUser(overrides: { name?: string; email?: string; password?: string } = {}) {
    const password = overrides.password ?? 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    return usersManager.createUser({
        name: overrides.name ?? 'Test User',
        email: overrides.email ?? 'test@example.com',
        hashedPassword,
    });
}

describe('POST /api/auth', () => {
    it('returns 200 with id, name, email, and token on valid credentials', async () => {
        const user = await createTestUser({ email: 'auth@example.com', password: 'secret123' });

        const res = await request(app)
            .post('/api/auth')
            .send({ email: 'auth@example.com', password: 'secret123' });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(user.id);
        expect(res.body.name).toBe(user.name);
        expect(res.body.email).toBe(user.email);
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.length).toBeGreaterThan(0);
    });

    it('returns 400 with wrong password', async () => {
        await createTestUser({ email: 'auth@example.com', password: 'secret123' });

        const res = await request(app)
            .post('/api/auth')
            .send({ email: 'auth@example.com', password: 'wrongpassword' });

        expect(res.status).toBe(400);
        expect(res.text).toBe('Incorrect email or password');
    });

    it('returns 400 for non-existent user', async () => {
        const res = await request(app)
            .post('/api/auth')
            .send({ email: 'nobody@example.com', password: 'anypassword' });

        expect(res.status).toBe(400);
        expect(res.text).toBe('Incorrect email or password');
    });

    it('returns 400 when email is missing', async () => {
        const res = await request(app)
            .post('/api/auth')
            .send({ password: 'secret123' });

        expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
        const res = await request(app)
            .post('/api/auth')
            .send({ email: 'auth@example.com' });

        expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid format', async () => {
        const res = await request(app)
            .post('/api/auth')
            .send({ email: 'not-an-email', password: 'secret123' });

        expect(res.status).toBe(400);
    });
});
