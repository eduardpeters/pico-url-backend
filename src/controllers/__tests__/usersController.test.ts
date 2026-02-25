import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../managers/usersManager.js');
vi.mock('bcrypt');

import usersManager from '../../managers/usersManager.js';
import bcrypt from 'bcrypt';
import usersController from '../usersController.js';

const mockUserPublic = {
    id: 'user-uuid-123',
    name: 'Alice',
    email: 'alice@example.com',
    created: new Date('2024-01-01'),
};

const mockUserFull = {
    ...mockUserPublic,
    hashedPassword: 'hashed-password',
};

// Creates a request object. Optionally includes a JWT user on req (for authenticated routes).
function makeReq(body: object = {}, userId = 'user-uuid-123'): Request {
    return {
        body,
        user: { _id: userId },
    } as unknown as Request;
}

function makeRes() {
    const json = vi.fn().mockReturnThis();
    const send = vi.fn().mockReturnThis();
    const status = vi.fn().mockReturnValue({ json, send });
    const res = { status } as unknown as Response;
    return { res, status, json, send };
}

beforeEach(() => {
    vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------
describe('usersController.registerUser', () => {
    it('returns 400 when Joi validation fails (missing name)', async () => {
        const req = makeReq({ email: 'alice@example.com', password: 'secret' });
        const { res, status, send } = makeRes();

        await usersController.registerUser(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalled();
    });

    it('returns 400 when email is already in use', async () => {
        vi.mocked(usersManager.getByEmail).mockResolvedValue(mockUserFull);

        const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
        const { res, status, send } = makeRes();

        await usersController.registerUser(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith('User already exists');
    });

    it('returns 201 with new user on successful registration', async () => {
        vi.mocked(usersManager.getByEmail).mockResolvedValue(undefined);
        vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as any);
        vi.mocked(usersManager.createUser).mockResolvedValue(mockUserPublic);

        const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
        const { res, status, json } = makeRes();

        await usersController.registerUser(req, res);

        expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
        expect(usersManager.createUser).toHaveBeenCalledWith({
            name: 'Alice',
            email: 'alice@example.com',
            hashedPassword: 'hashed-password',
        });
        expect(status).toHaveBeenCalledWith(201);
        expect(json).toHaveBeenCalledWith(mockUserPublic);
    });

    it('returns 500 when DB lookup throws', async () => {
        vi.mocked(usersManager.getByEmail).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
        const { res, status, send } = makeRes();

        await usersController.registerUser(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error occurred');
    });

    it('returns 500 when createUser throws', async () => {
        vi.mocked(usersManager.getByEmail).mockResolvedValue(undefined);
        vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as any);
        vi.mocked(usersManager.createUser).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
        const { res, status, send } = makeRes();

        await usersController.registerUser(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Error creating user');
    });
});

// ---------------------------------------------------------------------------
// getUser
// ---------------------------------------------------------------------------
describe('usersController.getUser', () => {
    it('returns 200 with user data when user exists', async () => {
        vi.mocked(usersManager.getById).mockResolvedValue(mockUserPublic);

        const req = makeReq({}, 'user-uuid-123');
        const { res, status, json } = makeRes();

        await usersController.getUser(req, res);

        expect(usersManager.getById).toHaveBeenCalledWith('user-uuid-123');
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(mockUserPublic);
    });

    it('returns 404 when user is not found', async () => {
        vi.mocked(usersManager.getById).mockResolvedValue(undefined);

        const req = makeReq({}, 'user-uuid-123');
        const { res, status, send } = makeRes();

        await usersController.getUser(req, res);

        expect(status).toHaveBeenCalledWith(404);
        expect(send).toHaveBeenCalledWith('User not found');
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(usersManager.getById).mockRejectedValue(new Error('DB error'));

        const req = makeReq({}, 'user-uuid-123');
        const { res, status, send } = makeRes();

        await usersController.getUser(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Error retrieving user');
    });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------
describe('usersController.deleteUser', () => {
    it('returns 204 on successful deletion', async () => {
        vi.mocked(usersManager.deleteUser).mockResolvedValue(undefined);

        const send = vi.fn();
        const status = vi.fn().mockReturnValue({ send });
        const res = { status } as unknown as Response;
        const req = makeReq({}, 'user-uuid-123');

        await usersController.deleteUser(req, res);

        expect(usersManager.deleteUser).toHaveBeenCalledWith('user-uuid-123');
        expect(status).toHaveBeenCalledWith(204);
        expect(send).toHaveBeenCalled();
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(usersManager.deleteUser).mockRejectedValue(new Error('DB error'));

        const req = makeReq({}, 'user-uuid-123');
        const { res, status, send } = makeRes();

        await usersController.deleteUser(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------
describe('usersController.updateUser', () => {
    it('returns 400 when Joi validation fails (empty body)', async () => {
        const req = makeReq({});
        const { res, status, send } = makeRes();

        await usersController.updateUser(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalled();
    });

    it('updates only the name when only name is provided', async () => {
        vi.mocked(usersManager.updateUser).mockResolvedValue({ ...mockUserPublic, name: 'Alice Updated' });

        const req = makeReq({ name: 'Alice Updated' }, 'user-uuid-123');
        const { res, status, json } = makeRes();

        await usersController.updateUser(req, res);

        expect(usersManager.updateUser).toHaveBeenCalledWith('user-uuid-123', { name: 'Alice Updated' });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ ...mockUserPublic, name: 'Alice Updated' });
    });

    it('updates only the email when only email is provided', async () => {
        vi.mocked(usersManager.updateUser).mockResolvedValue({ ...mockUserPublic, email: 'new@example.com' });

        const req = makeReq({ email: 'new@example.com' }, 'user-uuid-123');
        const { res, status, json } = makeRes();

        await usersController.updateUser(req, res);

        expect(usersManager.updateUser).toHaveBeenCalledWith('user-uuid-123', { email: 'new@example.com' });
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ ...mockUserPublic, email: 'new@example.com' });
    });

    it('hashes the new password when password is provided', async () => {
        vi.mocked(bcrypt.hash).mockResolvedValue('new-hashed-password' as any);
        vi.mocked(usersManager.updateUser).mockResolvedValue(mockUserPublic);

        const req = makeReq({ password: 'newpassword' }, 'user-uuid-123');
        const { res, status } = makeRes();

        await usersController.updateUser(req, res);

        expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 10);
        expect(usersManager.updateUser).toHaveBeenCalledWith('user-uuid-123', { hashedPassword: 'new-hashed-password' });
        expect(status).toHaveBeenCalledWith(200);
    });

    it('returns 404 when user is not found', async () => {
        vi.mocked(usersManager.updateUser).mockResolvedValue(undefined);

        const req = makeReq({ name: 'Alice Updated' }, 'user-uuid-123');
        const { res, status, send } = makeRes();

        await usersController.updateUser(req, res);

        expect(status).toHaveBeenCalledWith(404);
        expect(send).toHaveBeenCalledWith('User not found');
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(usersManager.updateUser).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ name: 'Alice Updated' }, 'user-uuid-123');
        const { res, status, send } = makeRes();

        await usersController.updateUser(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });
});
