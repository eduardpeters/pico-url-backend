import User from '../models/user.js';
import { UserInterface } from '../types/picodeclarations.js';
import { UpdatedUserInterface } from '../types/picodeclarations.js';

class usersManager {
    static async getByEmail(email: string) {
        const user = await User.findOne({ email: email }).lean();
        if (user) {
            return userDocumentToObject(user);
        }
        return user;
    }

    static async getById(id: string) {
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

    static async deleteUser(id: string) {
        await User.deleteOne({ _id: id });
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

    static async updateUser(id: string, updatedUser: UpdatedUserInterface) {
        const user = await User.findByIdAndUpdate(id, updatedUser, { returnDocument: "after" });
        if (!user) {
            return null;
        }
        return {
            _id: user._id,
            name: user.name,
            email: user.email,
        }
    }
}

function userDocumentToObject(userDocument: UserInterface) {
    return {...userDocument,
        _id: userDocument._id?.toString()
    }
}

export default usersManager;