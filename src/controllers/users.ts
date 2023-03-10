import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import User from '../models/user.js';
import { validateUser, validateUpdateBody } from '../helpers/validation.js';
import { RequestUser, UserInterface } from '../types/picodeclarations';

async function registerUser(req: Request, res: Response) {
    const { error } = validateUser(req.body);
    if (error) {
        console.log(error);
        return res.status(400).send(error.details[0].message);
    }
    let user = await User.findOne({ email: req.body.email });
    if (user) {
        return res.status(400).send('User already exists');
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user = new User({
        name: req.body.name,
        email: req.body.email,
        password: hashedPassword
    });
    try {
        await user.save();
        const userInfo = {
            _id: user._id,
            name: user.name,
            email: user.email,
        }
        return res.status(201).json(userInfo);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error creating user');
    }
}

async function getUser(req: Request, res: Response) {
    try {
        const user: UserInterface | null = await User.findById((req as Request & RequestUser).user._id);
        if (!user) {
            return res.status(404).send('User not found');
        }
        const userInfo = {
            _id: user._id,
            name: user.name,
            email: user.email,
        }
        return res.status(200).json(userInfo);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error creating user');
    }
}

async function deleteUser(req: Request, res: Response) {
    try {
        await User.deleteOne({ _id: (req as Request & RequestUser).user._id });
        return res.status(204).send();
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

async function updateUser(req: Request, res: Response) {
    const { error } = validateUpdateBody(req.body);
    if (error) {
        console.log(error);
        return res.status(400).send(error.details[0].message);
    }
    const updatedUser: { name?: string, email?: string, password?: string } = {};
    if (req.body.name) {
        updatedUser.name = req.body.name;
    }
    if (req.body.email) {
        updatedUser.email = req.body.email;
    }
    if (req.body.password) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        updatedUser.password = hashedPassword;
    }
    try {
        const result = await User.findByIdAndUpdate((req as Request & RequestUser).user._id, updatedUser, { returnDocument: "after" });
        if (!result) {
            return res.status(404).send('User not found');
        }
        const userInfo = {
            _id: result._id,
            name: result.name,
            email: result.email,
        }
        res.status(200).json(userInfo);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

export default { registerUser, getUser, deleteUser, updateUser };