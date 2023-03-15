import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { validateUser, validateUpdateBody } from '../helpers/validation.js';
import { RequestUser, UpdatedUserInterface } from '../types/picodeclarations';
import usersManager from '../managers/usersManager.js';

async function registerUser(req: Request, res: Response) {
    const { error } = validateUser(req.body);
    if (error) {
        return res.status(400).send(error.details[0].message);
    }
    let user;
    try {
        user = await usersManager.getByEmail(req.body.email);
    } catch (error) {
        return res.status(500).send('Database error occurred');
    }
    if (user) {
        return res.status(400).send('User already exists');
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    try {
        user = await usersManager.createUser({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error creating user');
    }
    return res.status(201).json(user);
}

async function getUser(req: Request, res: Response) {
    try {
        const user = await usersManager.getById((req as Request & RequestUser).user._id);
        if (!user) {
            return res.status(404).send('User not found');
        }
        return res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Error creating user');
    }
}

async function deleteUser(req: Request, res: Response) {
    try {
        await usersManager.deleteUser((req as Request & RequestUser).user._id);
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
    const updatedUser: UpdatedUserInterface = {};
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
        const user = await usersManager.updateUser((req as Request & RequestUser).user._id, updatedUser);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        return res.status(500).send('Database error');
    }
}

export default { registerUser, getUser, deleteUser, updateUser };