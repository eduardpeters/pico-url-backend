import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

vi.mock('../../managers/urlsManager.js');
vi.mock('nanoid');

import urlsManager from '../../managers/urlsManager.js';
import { nanoid } from 'nanoid';
import urlsController from '../urlsController.js';

const OWNER_ID = 'user-uuid-owner';
const OTHER_ID = 'user-uuid-other';
const SHORT = 'abc1234567';

const mockUrl = {
    id: 'url-uuid-1',
    userId: OWNER_ID,
    original: 'https://example.com',
    short: SHORT,
    visits: 0,
    created: new Date('2024-01-01'),
};

// Creates a request with the authenticated user already attached (simulating verifyJWT).
function makeReq(
    opts: { body?: object; params?: Record<string, string>; userId?: string } = {},
): Request {
    return {
        body: opts.body ?? {},
        params: opts.params ?? {},
        user: { _id: opts.userId ?? OWNER_ID },
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
// getAllUrls
// ---------------------------------------------------------------------------
describe('urlsController.getAllUrls', () => {
    it('returns 200 with all URLs for the authenticated user', async () => {
        vi.mocked(urlsManager.getAllByUser).mockResolvedValue([mockUrl]);

        const req = makeReq({ userId: OWNER_ID });
        const { res, status, json } = makeRes();

        await urlsController.getAllUrls(req, res);

        expect(urlsManager.getAllByUser).toHaveBeenCalledWith(OWNER_ID);
        expect(status).toHaveBeenCalledWith(200);
        // short code is prefixed with URL_BASE
        expect(json).toHaveBeenCalledWith([
            expect.objectContaining({ short: `http://localhost:4242/${SHORT}` }),
        ]);
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(urlsManager.getAllByUser).mockRejectedValue(new Error('DB error'));

        const req = makeReq();
        const { res, status, send } = makeRes();

        await urlsController.getAllUrls(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Unable to retrieve URLs');
    });
});

// ---------------------------------------------------------------------------
// getUrl (authenticated — checks ownership)
// ---------------------------------------------------------------------------
describe('urlsController.getUrl', () => {
    it('returns 400 when short URL is not 10 characters', async () => {
        const req = makeReq({ params: { shorturl: 'short' } });
        const { res, status, send } = makeRes();

        await urlsController.getUrl(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith('Invalid shortened URL length');
    });

    it('returns 401 when the URL belongs to a different user', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue({ ...mockUrl, userId: OTHER_ID });

        const req = makeReq({ params: { shorturl: SHORT }, userId: OWNER_ID });
        const { res, status, send } = makeRes();

        await urlsController.getUrl(req, res);

        expect(status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Not authorized to view this URL');
    });

    it('returns 200 with URL data for the owner', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue(mockUrl);

        const req = makeReq({ params: { shorturl: SHORT }, userId: OWNER_ID });
        const { res, status, json } = makeRes();

        await urlsController.getUrl(req, res);

        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(
            expect.objectContaining({ short: `http://localhost:4242/${SHORT}` }),
        );
    });

    it('returns 404 when URL is not found', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue(undefined);

        const req = makeReq({ params: { shorturl: SHORT } });
        const { res, status, send } = makeRes();

        await urlsController.getUrl(req, res);

        expect(status).toHaveBeenCalledWith(404);
        expect(send).toHaveBeenCalledWith('No matching shortened URL found');
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ params: { shorturl: SHORT } });
        const { res, status, send } = makeRes();

        await urlsController.getUrl(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });
});

// ---------------------------------------------------------------------------
// getUrlCount
// ---------------------------------------------------------------------------
describe('urlsController.getUrlCount', () => {
    it('returns 200 with the URL count', async () => {
        vi.mocked(urlsManager.getCount).mockResolvedValue(5);

        const req = makeReq({ userId: OWNER_ID });
        const { res, status, json } = makeRes();

        await urlsController.getUrlCount(req, res);

        expect(urlsManager.getCount).toHaveBeenCalledWith(OWNER_ID);
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ count: 5 });
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(urlsManager.getCount).mockRejectedValue(new Error('DB error'));

        const req = makeReq();
        const { res, status, send } = makeRes();

        await urlsController.getUrlCount(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });
});

// ---------------------------------------------------------------------------
// getOriginalUrl (public — increments visits)
// ---------------------------------------------------------------------------
describe('urlsController.getOriginalUrl', () => {
    it('returns 400 when short URL is not 10 characters', async () => {
        const req = makeReq({ params: { shorturl: 'tooshort' } });
        const { res, status, send } = makeRes();

        await urlsController.getOriginalUrl(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalledWith('Invalid shortened URL length');
    });

    it('returns 200 with original URL and increments visits', async () => {
        vi.mocked(urlsManager.getByShortUrlAndIncreaseVisits).mockResolvedValue({
            ...mockUrl,
            visits: 1,
        });

        const req = makeReq({ params: { shorturl: SHORT } });
        const { res, status, json } = makeRes();

        await urlsController.getOriginalUrl(req, res);

        expect(urlsManager.getByShortUrlAndIncreaseVisits).toHaveBeenCalledWith(SHORT);
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ originalUrl: mockUrl.original });
    });

    it('returns 404 when URL is not found', async () => {
        vi.mocked(urlsManager.getByShortUrlAndIncreaseVisits).mockResolvedValue(undefined);

        const req = makeReq({ params: { shorturl: SHORT } });
        const { res, status, send } = makeRes();

        await urlsController.getOriginalUrl(req, res);

        expect(status).toHaveBeenCalledWith(404);
        expect(send).toHaveBeenCalledWith('No matching shortened URL found');
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(urlsManager.getByShortUrlAndIncreaseVisits).mockRejectedValue(
            new Error('DB error'),
        );

        const req = makeReq({ params: { shorturl: SHORT } });
        const { res, status, send } = makeRes();

        await urlsController.getOriginalUrl(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });
});

// ---------------------------------------------------------------------------
// createUrl
// ---------------------------------------------------------------------------
describe('urlsController.createUrl', () => {
    it('returns 400 when Joi validation fails (not a URI)', async () => {
        const req = makeReq({ body: { url: 'not-a-url' } });
        const { res, status, send } = makeRes();

        await urlsController.createUrl(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalled();
    });

    it('returns 200 with existing short URL when original already exists (idempotent)', async () => {
        vi.mocked(urlsManager.getByOriginalUrl).mockResolvedValue(mockUrl);

        const req = makeReq({ body: { url: mockUrl.original } });
        const { res, status, json } = makeRes();

        await urlsController.createUrl(req, res);

        expect(urlsManager.createUrl).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith({ shortUrl: `http://localhost:4242/${SHORT}` });
    });

    it('returns 201 with new short URL when original does not exist', async () => {
        vi.mocked(urlsManager.getByOriginalUrl).mockResolvedValue(undefined);
        vi.mocked(nanoid).mockReturnValue(SHORT as unknown as never);
        vi.mocked(urlsManager.createUrl).mockResolvedValue(mockUrl);

        const req = makeReq({ body: { url: mockUrl.original }, userId: OWNER_ID });
        const { res, status, json } = makeRes();

        await urlsController.createUrl(req, res);

        expect(urlsManager.createUrl).toHaveBeenCalledWith({
            userId: OWNER_ID,
            original: mockUrl.original,
            short: SHORT,
        });
        expect(status).toHaveBeenCalledWith(201);
        expect(json).toHaveBeenCalledWith({ shortUrl: `http://localhost:4242/${SHORT}` });
    });

    it('returns 500 when DB lookup for existing URL throws', async () => {
        vi.mocked(urlsManager.getByOriginalUrl).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ body: { url: 'https://example.com' } });
        const { res, status, send } = makeRes();

        await urlsController.createUrl(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });

    it('returns 500 when createUrl DB call throws', async () => {
        vi.mocked(urlsManager.getByOriginalUrl).mockResolvedValue(undefined);
        vi.mocked(nanoid).mockReturnValue(SHORT as unknown as never);
        vi.mocked(urlsManager.createUrl).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ body: { url: 'https://example.com' } });
        const { res, status, send } = makeRes();

        await urlsController.createUrl(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Error shortening URL');
    });
});

// ---------------------------------------------------------------------------
// updateUrl
// ---------------------------------------------------------------------------
describe('urlsController.updateUrl', () => {
    it('returns 400 when Joi validation fails', async () => {
        const req = makeReq({ params: { shorturl: SHORT }, body: { url: 'not-a-url' } });
        const { res, status, send } = makeRes();

        await urlsController.updateUrl(req, res);

        expect(status).toHaveBeenCalledWith(400);
        expect(send).toHaveBeenCalled();
    });

    it('returns 404 when the URL is not found', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue(undefined);

        const req = makeReq({
            params: { shorturl: SHORT },
            body: { url: 'https://new.example.com' },
        });
        const { res, status, send } = makeRes();

        await urlsController.updateUrl(req, res);

        expect(status).toHaveBeenCalledWith(404);
        expect(send).toHaveBeenCalledWith('No matching shortened URL found');
    });

    it('returns 401 when the URL belongs to a different user', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue({ ...mockUrl, userId: OTHER_ID });

        const req = makeReq({
            params: { shorturl: SHORT },
            body: { url: 'https://new.example.com' },
            userId: OWNER_ID,
        });
        const { res, status, send } = makeRes();

        await urlsController.updateUrl(req, res);

        expect(status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Not authorized to edit this URL');
    });

    it('returns 200 with updated URL on success', async () => {
        const updatedUrl = { ...mockUrl, original: 'https://new.example.com' };
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue(mockUrl);
        vi.mocked(urlsManager.updateUrl).mockResolvedValue(updatedUrl);

        const req = makeReq({
            params: { shorturl: SHORT },
            body: { url: 'https://new.example.com' },
            userId: OWNER_ID,
        });
        const { res, status, json } = makeRes();

        await urlsController.updateUrl(req, res);

        expect(urlsManager.updateUrl).toHaveBeenCalledWith(mockUrl.id, 'https://new.example.com');
        expect(status).toHaveBeenCalledWith(200);
        expect(json).toHaveBeenCalledWith(updatedUrl);
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockRejectedValue(new Error('DB error'));

        const req = makeReq({
            params: { shorturl: SHORT },
            body: { url: 'https://new.example.com' },
        });
        const { res, status, send } = makeRes();

        await urlsController.updateUrl(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });
});

// ---------------------------------------------------------------------------
// deleteUrl
// ---------------------------------------------------------------------------
describe('urlsController.deleteUrl', () => {
    it('returns 204 when URL is found and belongs to the authenticated user', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue(mockUrl);
        vi.mocked(urlsManager.deleteByShortUrl).mockResolvedValue(undefined);

        const send = vi.fn();
        const status = vi.fn().mockReturnValue({ send });
        const res = { status } as unknown as Response;
        const req = makeReq({ params: { shorturl: SHORT }, userId: OWNER_ID });

        await urlsController.deleteUrl(req, res);

        expect(urlsManager.deleteByShortUrl).toHaveBeenCalledWith(SHORT);
        expect(status).toHaveBeenCalledWith(204);
    });

    it('returns 401 when the URL belongs to a different user', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue({ ...mockUrl, userId: OTHER_ID });

        const req = makeReq({ params: { shorturl: SHORT }, userId: OWNER_ID });
        const { res, status, send } = makeRes();

        await urlsController.deleteUrl(req, res);

        expect(urlsManager.deleteByShortUrl).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(401);
        expect(send).toHaveBeenCalledWith('Not authorized to delete this URL');
    });

    it('returns 204 (idempotent) when URL does not exist', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockResolvedValue(undefined);

        const send = vi.fn();
        const status = vi.fn().mockReturnValue({ send });
        const res = { status } as unknown as Response;
        const req = makeReq({ params: { shorturl: SHORT } });

        await urlsController.deleteUrl(req, res);

        expect(urlsManager.deleteByShortUrl).not.toHaveBeenCalled();
        expect(status).toHaveBeenCalledWith(204);
    });

    it('returns 500 when the database throws', async () => {
        vi.mocked(urlsManager.getByShortUrl).mockRejectedValue(new Error('DB error'));

        const req = makeReq({ params: { shorturl: SHORT } });
        const { res, status, send } = makeRes();

        await urlsController.deleteUrl(req, res);

        expect(status).toHaveBeenCalledWith(500);
        expect(send).toHaveBeenCalledWith('Database error');
    });
});
