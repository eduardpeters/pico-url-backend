import mongoose from 'mongoose';
import Url from '../models/url.js';

class urlsManager {
    static async getAllByUser(userId: mongoose.Types.ObjectId) {
        return await Url.find({ userId: userId });
    }

    static async getByShortUrl(shortUrl: string) {
        return await Url.findOne({ shortUrl: shortUrl });
    }

    static async getCount(userId: mongoose.Types.ObjectId) {
        return await Url.countDocuments({ userId: userId });
    }
}

export default urlsManager;