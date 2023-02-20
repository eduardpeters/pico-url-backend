import { Request, Response } from 'express';
import { validateUrl } from '../helpers/validation';
import Url from '../models/url';
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
    return res.status(200).send("GET success");
}

async function redirectUrl(req: Request, res: Response) {
    return res.status(200).send("Redirect success");
}

async function createUrl(req: Request, res: Response) {
    const { error } = validateUrl(req.body);
    if (error) {
        console.log(error);
        return res.status(400).send(error.details[0].message);
    }
    let url = await Url.findOne({ originalUrl: req.body.url });
    if (url) {
        return res.status(200).json({ shortUrl: url.shortUrl });
    }
    url = new Url({
        userId: (req as Request & RequestUser).user._id,
        originalUrl: req.body.url,
        shortUrl: "aBcDE01234",
    });
    try {
        await url.save();
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
    return res.status(200).send("DELETE success");
}

export default {
    getAllUrls,
    getUrl,
    redirectUrl,
    createUrl,
    updateUrl,
    deleteUrl
};