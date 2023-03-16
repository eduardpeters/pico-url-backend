import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { RequestUser } from '../types/picodeclarations';

function verifyJWT(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).send('Incorrect token provided');
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        (req as Request & RequestUser).user = (decoded as {_id: string});
        next();
    } catch (error) {
        console.log(error);
        return res.status(401).send('Invalid token');
    }
}

export default verifyJWT;