import { Request, Response } from 'express';
import { User, validateUser } from '../models/user';

async function registerUser(req: Request, res: Response) {
    const { error, value } = validateUser(req.body);
    if (error) {
        console.log(error);
        return res.status(400).send(error.details[0].message);
    }
    let user = await User.findOne({ email: req.body.email });
    if (user) {
        return res.status(400).send('User already exists');
    }
    user = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password
    });
    try {
        await user.save();
        return res.status(201).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error creating user');
    }
}

export default { registerUser };