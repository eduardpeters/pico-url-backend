import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../managers/usersManager.js');
vi.mock('bcrypt');
vi.mock('jsonwebtoken');

import usersManager from '../../managers/usersManager.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import authController from '../authController.js';

const mockUserFull = {
    id: 'user-uuid-123',
    name: 'Alice',
    email: 'alice@example.com',
    hashedPassword: 'hashed-password',
    created: new Date('2024-01-01'),
};

function makeReq(body: object): Request {
    return { body } as unknown as Request;
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

describe('authController.authorizeUser', () => {
    it('returns 400 when request body fails Joi validation (missing email)', async () => {
        const req = makeReq({ password: 'secret' });
        const { res, status, send } = makeRes();

        await authController.authorizeUser(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalled();
    });

    it('returns 400 when request body fails Joi validation (invalid email format)', async () => {
        const req = makeReq({ email: 'not-an-email', password: 'secret' });
        const { res, status, send } = makeRes();

        await authController.authorizeUser(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalled();
    });

    it('returns 400 when user is not found', async () => {
        vi.mocked(usersManager.getByEmail).mockResolvedValue(undefined);

        const req = makeReq({ email: 'alice@example.com', password: 'secret' });
        const { res, status, send } = makeRes();

        await authController.authorizeUser(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith('Incorrect email or password');
    });

    it('returns 400 when password does not match', async () => {
        vi.mocked(usersManager.getByEmail).mockResolvedValue(mockUserFull);
        vi.mocked(bcrypt.compare).mockResolvedValue(false as unknown as never);

        const req = makeReq({ email: 'alice@example.com', password: 'wrongpassword' });
        const { res, status, send } = makeRes();

        await authController.authorizeUser(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith('Incorrect email or password');
    });

    it('returns 200 with token and user info on successful login', async () => {
        vi.mocked(usersManager.getByEmail).mockResolvedValue(mockUserFull);
        vi.mocked(bcrypt.compare).mockResolvedValue(true as unknown as never);
        vi.mocked(jwt.sign).mockReturnValue('signed.jwt.token' as unknown as never);

        const req = makeReq({ email: 'alice@example.com', password: 'secret' });
        const { res, status, json } = makeRes();

        await authController.authorizeUser(req, res);

        expect(jwt.sign).toHaveBeenCalledWith(
            { _id: mockUserFull.id },
            'test-jwt-secret-for-unit-tests-only',
            { expiresIn: 3600 },
        );
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({
            id: mockUserFull.id,
            name: mockUserFull.name,
            email: mockUserFull.email,
            token: 'signed.jwt.token',
        });
    });

    it('returns 500 when the database throws during user lookup', async () => {
        vi.mocked(usersManager.getByEmail).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ email: 'alice@example.com', password: 'secret' });
        const { res, status, send } = makeRes();

        await authController.authorizeUser(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error occurred');
    });
});
