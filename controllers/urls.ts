import { Request, Response } from 'express';

async function getAllUrls(req: Request, res: Response) {
    return res.status(200).send("GET success");
}

async function getUrl(req: Request, res: Response) {
    return res.status(200).send("GET success");
}

async function redirectUrl(req: Request, res: Response) {
    return res.status(200).send("Redirect success");
}

async function createUrl(req: Request, res: Response) {
    return res.status(200).send("POST success");
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