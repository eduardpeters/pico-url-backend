import { ObjectId } from "mongoose"

export interface UserInterface {
    _id?: ObjectId,
    name: string,
    email: string,
    password: string
}

export interface RequestUser {
    user: {
        _id: ObjectId
    }
}