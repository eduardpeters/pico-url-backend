import Joi from 'joi';
import mongoose from 'mongoose';
import { UserInterface } from '../types/picotypes';

export const Url = mongoose.model('Url', new mongoose.Schema({
    userId: {
        type: mongoose.SchemaTypes.ObjectId,
        required: true,
    },
    originalUrl: {
        type: String,
        required: true,
        unique: true,
    },
    shortUrl: {
        type: String,
        required: true,
        unique: true,
    },
    visits: {
        type: Number,
        required: true,
        default: 0,
    },
    date: {
        type: String,
        default: Date.now,
    }
}));

export function validateUrl(url: { url: string }) {
    const schema = Joi.object({
        url: Joi.string().uri().required(),
    });
    return schema.validate(url);
};