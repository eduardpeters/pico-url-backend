import mongoose from 'mongoose';
import User from '../models/user.js';
import { UserInterface } from '../types/picodeclarations.js';

class usersManager {
    static async getByEmail(email: string) {
        return await User.findOne({ email: email });
    }

    static async getById(id: mongoose.Types.ObjectId) {
        const user = await User.findById(id);
        if (!user) {
            return null;
        }
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
        }
    }

    static async createUser(newUser: UserInterface) {
        const user = new User({
            name: newUser.name,
            email: newUser.email,
            password: newUser.password
        });
        await user.save();
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
        }
    }
}

export default usersManager;