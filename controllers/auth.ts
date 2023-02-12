import { Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import { User } from '../models/user';

async function authorizeUser(req: Request, res: Response) {
    const { error } = validateAuthBody(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(400).send('Incorrect email or password');
    }
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
        return res.status(400).send('Incorrect email or password');
    }
    return res.status(200).send(true);
}

function validateAuthBody(body: { email: string, password: string }) {
    const schema = Joi.object({
        email: Joi.string().min(5).max(255).required().email(),
        password: Joi.string().min(5).max(255).required()
    });
    return schema.validate(body);
}

export default { authorizeUser }