import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Must mock jsonwebtoken before importing the middleware
vi.mock('jsonwebtoken');

import verifyJWT from '../verifyJWT.js';

const mockNext = vi.fn() as unknown as NextFunction;

function makeReq(authHeader?: string): Request {
    return {
        headers: {
            authorization: authHeader,
        },
    } as unknown as Request;
}

function makeRes(): {
    res: Response;
    status: ReturnType<typeof vi.fn>;
    send: ReturnType<typeof vi.fn>;
} {
    const send = vi.fn().mockReturnThis();
    const status = vi.fn().mockReturnValue({ send });
    const res = { status } as unknown as Response;
    return { res, status, send };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('verifyJWT', () => {
    it('calls next() and attaches user to req when token is valid', () => {
        const decoded = { _id: 'user-uuid-123' };
        vi.mocked(jwt.verify).mockReturnValue(decoded as unknown as never);

        const req = makeReq('Bearer valid.token.here');
        const { res } = makeRes();

        verifyJWT(req, res, mockNext);

        expect(jwt.verify).toHaveBeenCalledWith(
            'valid.token.here',
            'test-jwt-secret-for-unit-tests-only',
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((req as any).user).toEqual(decoded);
        expect(mockNext).toHaveBeenCalledOnce();
    });

    it('returns 401 when Authorization header is missing', () => {
        const req = makeReq(undefined);
        const { res, status, send } = makeRes();

        verifyJWT(req, res, mockNext);

        expect(status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Incorrect token provided');
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 when Authorization header has no Bearer token', () => {
        // "Bearer" with no token — split gives ['Bearer', undefined-ish]
        const req = makeReq('Bearer');
        const { res, status, send } = makeRes();

        verifyJWT(req, res, mockNext);

        expect(status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Incorrect token provided');
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 when jwt.verify throws (invalid token)', () => {
        vi.mocked(jwt.verify).mockImplementation(() => {
            throw new Error('invalid signature');
        });

        const req = makeReq('Bearer bad.token.here');
        const { res, status, send } = makeRes();

        verifyJWT(req, res, mockNext);

        expect(status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Invalid token');
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('returns 401 when jwt.verify throws TokenExpiredError', () => {
        const expiredError = new Error('jwt expired');
        expiredError.name = 'TokenExpiredError';
        vi.mocked(jwt.verify).mockImplementation(() => {
            throw expiredError;
        });

        const req = makeReq('Bearer expired.token.here');
        const { res, status, send } = makeRes();

        verifyJWT(req, res, mockNext);

        expect(status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Invalid token');
        expect(mockNext).not.toHaveBeenCalled();
    });
});
