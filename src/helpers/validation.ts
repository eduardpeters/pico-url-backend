import Joi from 'joi';
import { UserInterface } from '../types/picotypes';

export function validateUser(user: UserInterface) {
    const schema = Joi.object({
        name: Joi.string().min(5).max(50).required(),
        email: Joi.string().min(5).max(255).required().email(),
        password: Joi.string().min(5).max(1024).required()
    });
    return schema.validate(user);
}

export function validateUpdateBody(body: { name: string, email: string }) {
    const schema = Joi.object({
        name: Joi.string().min(5).max(50),
        email: Joi.string().min(5).max(255).email(),
        password: Joi.string().min(5).max(1024)
    }).min(1);
    return schema.validate(body);
}

export function validateAuthBody(body: { email: string, password: string }) {
    const schema = Joi.object({
        email: Joi.string().min(5).max(255).required().email(),
        password: Joi.string().min(5).max(255).required()
    });
    return schema.validate(body);
}

export function validateUrl(url: { url: string }) {
    const schema = Joi.object({
        url: Joi.string().uri().required(),
    });
    return schema.validate(url);
};