import mongoose from 'mongoose';
import Url from '../models/url.js';

class urlsManager {
    static async getAllByUser(userId: mongoose.Types.ObjectId) {
        return await Url.find({ userId: userId });
    }
}

export default urlsManager;