import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../../src/app.js';
import usersManager from '../../src/managers/usersManager.js';
import { setupTestDb, teardownTestDb, truncateTables } from '../../src/test-utils/db.js';

beforeAll(async () => {
    await setupTestDb();
});
afterAll(async () => {
    await teardownTestDb();
});
afterEach(async () => {
    await truncateTables();
});

async function createTestUser(
    overrides: { name?: string; email?: string; password?: string } = {},
) {
    const password = overrides.password ?? 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    return usersManager.createUser({
        name: overrides.name ?? 'Test User',
        email: overrides.email ?? 'test@example.com',
        hashedPassword,
    });
}

async function loginTestUser(email: string, password: string): Promise<string> {
    const res = await request(app).post('/api/auth').send({ email, password });
    return res.body.token as string;
}

describe('POST /api/users — register', () => {
    it('creates a user and returns 201 with public user data', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Alice');
        expect(res.body.email).toBe('alice@example.com');
        expect(typeof res.body.id).toBe('string');
        expect(res.body.hashedPassword).toBeUndefined();
    });

    it('returns 400 when email is already taken', async () => {
        await createTestUser({ email: 'dup@example.com' });

        const res = await request(app)
            .post('/api/users')
            .send({ name: 'Bobby', email: 'dup@example.com', password: 'password123' });

        expect(res.status).toBe(400);
        expect(res.text).toBe('User already exists');
    });

    it('returns 400 when name is too short', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({ name: 'Al', email: 'valid@example.com', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('returns 400 when email is invalid', async () => {
        const res = await request(app)
            .post('/api/users')
            .send({ name: 'Alice', email: 'not-an-email', password: 'password123' });

        expect(res.status).toBe(400);
    });

    it('returns 400 when required fields are missing', async () => {
        const res = await request(app).post('/api/users').send({ name: 'Alice' });

        expect(res.status).toBe(400);
    });
});

describe('GET /api/users — get authenticated user', () => {
    it('returns 200 with user data for authenticated user', async () => {
        await createTestUser({ email: 'get@example.com', password: 'password123' });
        const token = await loginTestUser('get@example.com', 'password123');

        const res = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.email).toBe('get@example.com');
        expect(res.body.hashedPassword).toBeUndefined();
    });

    it('returns 401 with no token', async () => {
        const res = await request(app).get('/api/users');

        expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
        const res = await request(app)
            .get('/api/users')
            .set('Authorization', 'Bearer not-a-valid-token');

        expect(res.status).toBe(401);
    });
});

describe('PATCH /api/users — update user', () => {
    it('updates name and returns 200 with updated user', async () => {
        await createTestUser({ email: 'update@example.com', password: 'password123' });
        const token = await loginTestUser('update@example.com', 'password123');

        const res = await request(app)
            .patch('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Updated Name' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated Name');
        expect(res.body.email).toBe('update@example.com');
    });

    it('updates email and returns 200', async () => {
        await createTestUser({ email: 'oldemail@example.com', password: 'password123' });
        const token = await loginTestUser('oldemail@example.com', 'password123');

        const res = await request(app)
            .patch('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .send({ email: 'newemail@example.com' });

        expect(res.status).toBe(200);
        expect(res.body.email).toBe('newemail@example.com');
    });

    it('updates password — new password works for login', async () => {
        await createTestUser({ email: 'passchange@example.com', password: 'oldpassword' });
        const token = await loginTestUser('passchange@example.com', 'oldpassword');

        const patchRes = await request(app)
            .patch('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .send({ password: 'newpassword' });
        expect(patchRes.status).toBe(200);

        // Old password should now fail
        const oldLoginRes = await request(app)
            .post('/api/auth')
            .send({ email: 'passchange@example.com', password: 'oldpassword' });
        expect(oldLoginRes.status).toBe(400);

        // New password should succeed
        const newLoginRes = await request(app)
            .post('/api/auth')
            .send({ email: 'passchange@example.com', password: 'newpassword' });
        expect(newLoginRes.status).toBe(200);
    });

    it('returns 400 when body is empty', async () => {
        await createTestUser({ email: 'update@example.com', password: 'password123' });
        const token = await loginTestUser('update@example.com', 'password123');

        const res = await request(app)
            .patch('/api/users')
            .set('Authorization', `Bearer ${token}`)
            .send({});

        expect(res.status).toBe(400);
    });

    it('returns 401 with no token', async () => {
        const res = await request(app).patch('/api/users').send({ name: 'Updated' });

        expect(res.status).toBe(401);
    });
});

describe('DELETE /api/users — delete user', () => {
    it('deletes the user and returns 204', async () => {
        await createTestUser({ email: 'delete@example.com', password: 'password123' });
        const token = await loginTestUser('delete@example.com', 'password123');

        const deleteRes = await request(app)
            .delete('/api/users')
            .set('Authorization', `Bearer ${token}`);
        expect(deleteRes.status).toBe(204);

        // Confirm user is gone — login should fail
        const loginRes = await request(app)
            .post('/api/auth')
            .send({ email: 'delete@example.com', password: 'password123' });
        expect(loginRes.status).toBe(400);
    });

    it('cascades to delete associated URLs', async () => {
        await createTestUser({ email: 'cascade@example.com', password: 'password123' });
        const token = await loginTestUser('cascade@example.com', 'password123');

        // Create a URL for this user
        const createUrlRes = await request(app)
            .post('/api/urls')
            .set('Authorization', `Bearer ${token}`)
            .send({ url: 'https://cascade-test.example.com' });
        expect(createUrlRes.status).toBe(201);
        const shortUrl: string = createUrlRes.body.shortUrl;
        const short = shortUrl.split('/').pop() as string;

        // Delete the user
        await request(app).delete('/api/users').set('Authorization', `Bearer ${token}`);

        // The URL should no longer be findable
        const getRes = await request(app).get(`/api/urls/${short}`);
        expect(getRes.status).toBe(404);
    });

    it('returns 401 with no token', async () => {
        const res = await request(app).delete('/api/users');
        expect(res.status).toBe(401);
    });
});
