import mongoose from 'mongoose';
import Url from '../models/url.js';
import { UrlInterface } from '../types/picodeclarations.js';

class urlsManager {
    static async getAllByUser(userId: mongoose.Types.ObjectId) {
        return await Url.find({ userId: userId });
    }

    static async getByShortUrl(shortUrl: string) {
        const urlEntry = await Url.findOne({ shortUrl: shortUrl }).lean();
        if (urlEntry) {
            return urlDocumentToObject(urlEntry);
        }
        return urlEntry;

    }

    static async getByShortUrlAndIncreaseVisits(shortUrl: string, amount = 1) {
        return await Url.findOneAndUpdate({ shortUrl: shortUrl }, { $inc: { visits: amount } });
    }

    static async getCount(userId: mongoose.Types.ObjectId) {
        return await Url.countDocuments({ userId: userId });
    }
}

function urlDocumentToObject(urlDocument: UrlInterface) { 
    const urlObject = {...urlDocument,
        _id: urlDocument._id?.toString(),
        userId: urlDocument.userId.toString()
    }
    return urlObject;
}

export default urlsManager;