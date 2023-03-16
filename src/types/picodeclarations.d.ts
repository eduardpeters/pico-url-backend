import mongoose from "mongoose"

export interface UserInterface {
    _id?: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
}

export interface RequestUser {
    user: {
        _id: mongoose.Types.ObjectId;
    }
}

export interface UpdatedUserInterface {
    name?: string;
    email?: string;
    password?: string;
}

export interface UrlInterface {
    _id?: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    originalUrl: string;
    shortUrl: string;
    visits: number;
    date: Date;
}