import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateAuthBody } from '../helpers/validation.js';
import usersManager from '../managers/usersManager.js';

async function authorizeUser(req: Request, res: Response) {
    const { error } = validateAuthBody(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    let user;
    try {
        user = await usersManager.getByEmail(req.body.email);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error occurred');
    }
    if (!user) {
        return res.status(400).send('Incorrect email or password');
    }
    const validPassword = await bcrypt.compare(req.body.password, user.password);
    if (!validPassword) {
        return res.status(400).send('Incorrect email or password');
    }
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string, { expiresIn: 3600 });
    return res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: token
    });
}

export default { authorizeUser }