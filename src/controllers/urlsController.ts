import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { validateUrl } from '../helpers/validation.js';
import urlsManager from '../managers/urlsManager.js';
import { RequestUser } from '../types/picodeclarations';

const SHORTIDLENGTH = 10;

async function getAllUrls(req: Request, res: Response) {
    try {
        const urlEntries = await urlsManager.getAllByUser((req as Request & RequestUser).user._id);
        urlEntries.forEach(entry => entry.shortUrl = appendBaseUrl(entry.shortUrl));
        return res.status(200).json(urlEntries);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Unable to retrieve URLs');
    }
}

async function getUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    if (shortUrl.length !== 10) {
        return res.status(400).send('Invalid shortened URL length');
    }
    try {
        const urlEntry = await urlsManager.getByShortUrl(shortUrl);
        if (urlEntry) {
            if (urlEntry.userId !== (req as Request & RequestUser).user._id) {
                return res.status(401).send('Not authorized to view this URL');
            }
            urlEntry.shortUrl = appendBaseUrl(urlEntry.shortUrl);
            return res.status(200).json(urlEntry);
        }
        return res.status(404).send('No matching shortened URL found');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

async function getUrlCount(req: Request, res: Response) {
    try {
        const urlCount = await urlsManager.getCount((req as Request & RequestUser).user._id);
        return res.status(200).json({ count: urlCount });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

async function getOriginalUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    if (shortUrl.length !== 10) {
        return res.status(400).send('Invalid shortened URL length');
    }
    try {
        const urlEntry = await urlsManager.getByShortUrlAndIncreaseVisits(shortUrl);
        if (urlEntry) {
            return res.status(200).json({ originalUrl: urlEntry.originalUrl });
        }
        return res.status(404).send('No matching shortened URL found');
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

async function createUrl(req: Request, res: Response) {
    const { error } = validateUrl(req.body);
    if (error) {
        console.log(error);
        return res.status(400).send(error.details[0].message);
    }
    let urlEntry;
    try {
        urlEntry = await urlsManager.getByOriginalUrl(req.body.url);
        if (urlEntry) {
            urlEntry.shortUrl = appendBaseUrl(urlEntry.shortUrl);
            return res.status(200).json({ shortUrl: urlEntry.shortUrl });
        }
    } catch (error) {
        return res.status(500).send('Database error');
    }
    const newUrl = {
        userId: (req as Request & RequestUser).user._id,
        originalUrl: req.body.url,
        shortUrl: nanoid(SHORTIDLENGTH),
    };
    try {
        urlEntry = await urlsManager.createUrl(newUrl);
        urlEntry.shortUrl = appendBaseUrl(urlEntry.shortUrl);
        return res.status(201).json({ shortUrl: urlEntry.shortUrl });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error shortening URL');
    }
}

async function updateUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    const { error } = validateUrl(req.body);
    if (error) {
        console.log(error);
        return res.status(400).send(error.details[0].message);
    }
    try {
        let urlEntry = await urlsManager.getByShortUrl(shortUrl);
        if (!urlEntry) {
            return res.status(404).send('No matching shortened URL found');
        }
        if (urlEntry.userId !== (req as Request & RequestUser).user._id) {
            return res.status(401).send('Not authorized to edit this URL');
        }
        urlEntry = await urlsManager.updateUrl(urlEntry._id as string, req.body.url);
        return res.status(200).json(urlEntry);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

async function deleteUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    try {
        const urlEntry = await urlsManager.getByShortUrl(shortUrl);
        if (urlEntry) {
            if (urlEntry.userId !== (req as Request & RequestUser).user._id) {
                return res.status(401).send('Not authorized to delete this URL');
            }
            await urlsManager.deleteByShortUrl(shortUrl);
        }
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

function appendBaseUrl(shortId: string) {
    return `${process.env.URL_BASE}/${shortId}`;
}

export default {
    getAllUrls,
    getUrl,
    getUrlCount,
    getOriginalUrl,
    createUrl,
    updateUrl,
    deleteUrl
};