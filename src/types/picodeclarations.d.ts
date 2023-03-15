import mongoose from "mongoose"

export interface UserInterface {
    _id?: mongoose.Types.ObjectId,
    name: string,
    email: string,
    password: string
}

export interface RequestUser {
    user: {
        _id: mongoose.Types.ObjectId
    }
}

export interface UpdatedUserInterface {
    name?: string;
    email?: string;
    password?: string;
}