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
        const user = await User.findById(id).lean();
        if (user) {
            return userDocumentToPasswordlessObject(user);
        }
        return user;
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
        return userDocumentToPasswordlessObject(user);
    }

    static async updateUser(id: string, updatedUser: UpdatedUserInterface) {
        const user = await User.findByIdAndUpdate(id, updatedUser, { returnDocument: "after" }).lean();
        if (user) {
            return userDocumentToPasswordlessObject(user);
        }
        return user;
    }
}

function userDocumentToObject(userDocument: UserInterface) {
    return {
        ...userDocument,
        _id: userDocument._id?.toString()
    }
}

function userDocumentToPasswordlessObject(userDocument: UserInterface) {
    return {
        _id: userDocument._id?.toString(),
        name: userDocument.name,
        email: userDocument.email,
    }
}

export default usersManager;