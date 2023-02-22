import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { validateUrl } from '../helpers/validation.js';
import Url from '../models/url.js';
import { RequestUser } from '../types/picotypes';

async function getAllUrls(req: Request, res: Response) {
    try {
        const urls = await Url.find({ userId: (req as Request & RequestUser).user._id });
        return res.status(200).json(urls);
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
            return res.status(301).redirect(urlEntry.originalUrl);
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
    let url = await Url.findOne({ originalUrl: req.body.url });
    if (url) {
        return res.status(200).json(url);
    }
    const shortId = nanoid(10);
    url = new Url({
        userId: (req as Request & RequestUser).user._id,
        originalUrl: req.body.url,
        shortUrl: shortId,
    });
    try {
        await url.save();
        url.shortUrl = `${process.env.URL_BASE}/${shortId}` 
        return res.status(201).json(url);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error shortening URL');
    }
}

async function updateUrl(req: Request, res: Response) {
    return res.status(200).send("PATCH success");
}

async function deleteUrl(req: Request, res: Response) {
    const shortUrl = req.params.shorturl;
    try {
        await Url.findOneAndDelete({ shortUrl: shortUrl });
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

export default {
    getAllUrls,
    getUrl,
    redirectUrl,
    createUrl,
    updateUrl,
    deleteUrl
};