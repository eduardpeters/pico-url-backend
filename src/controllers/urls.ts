import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { validateUrl } from '../helpers/validation.js';
import Url from '../models/url.js';
import { RequestUser } from '../types/picodeclarations';

async function getAllUrls(req: Request, res: Response) {
    try {
        const urlEntries = await Url.find({ userId: (req as Request & RequestUser).user._id });
        urlEntries.forEach(entry => entry.shortUrl = appendBaseUrl(entry.shortUrl));
        return res.status(200).json(urlEntries);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Unable to retrieve URLs');
    }
}

async function getUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    try {
        const urlEntry = await Url.findOne({ shortUrl: shortUrl });
        if (urlEntry) {
            if (!urlEntry.userId.equals((req as Request & RequestUser).user._id)) {
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

async function redirectUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    try {
        const urlEntry = await Url.findOneAndUpdate({ shortUrl: shortUrl }, { $inc: { visits: 1 } });
        if (urlEntry) {
            return res.status(200).json({originalUrl: urlEntry.originalUrl});
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
    try {
        let urlEntry = await Url.findOne({ originalUrl: req.body.url });
        if (urlEntry) {
            urlEntry.shortUrl = appendBaseUrl(urlEntry.shortUrl);
            return res.status(200).json(urlEntry);
        }
        const shortId = nanoid(10);
        urlEntry = new Url({
            userId: (req as Request & RequestUser).user._id,
            originalUrl: req.body.url,
            shortUrl: shortId,
        });
        await urlEntry.save();
        urlEntry.shortUrl = appendBaseUrl(shortId);
        return res.status(201).json(urlEntry);
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
        let urlEntry = await Url.findOne({ shortUrl: shortUrl });
        if (!urlEntry) {
            return res.status(404).send('No matching shortened URL found');
        }
        if (!urlEntry.userId.equals((req as Request & RequestUser).user._id)) {
            return res.status(401).send('Not authorized to edit this URL');
        }
        urlEntry.originalUrl = req.body.url;
        await urlEntry.save();
        return res.status(200).json(urlEntry);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

async function deleteUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    try {
        let urlEntry = await Url.findOne({ shortUrl: shortUrl });
        if (urlEntry) {
            if (!urlEntry.userId.equals((req as Request & RequestUser).user._id)) {
                return res.status(401).send('Not authorized to delete this URL');
            }
            await Url.findOneAndDelete({ shortUrl: shortUrl });
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
    redirectUrl,
    createUrl,
    updateUrl,
    deleteUrl
};