import Url from '../models/url.js';
import { UrlInterface } from '../types/picodeclarations.js';

class urlsManager {
    static async getAllByUser(userId: string) {
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
        const urlEntry = await Url.findOneAndUpdate({ shortUrl: shortUrl }, { $inc: { visits: amount } }).lean();
        if (urlEntry) {
            return urlDocumentToObject(urlEntry);
        }
        return urlEntry; 
    }

    static async getCount(userId: string) {
        return await Url.countDocuments({ userId: userId });
    }

    static async deleteByShortUrl(shortUrl: string) {
        await Url.findOneAndDelete({ shortUrl: shortUrl });
    }
}

function urlDocumentToObject(urlDocument: UrlInterface) { 
    return {...urlDocument,
        _id: urlDocument._id?.toString(),
        userId: urlDocument.userId.toString()
    }
}

export default urlsManager;