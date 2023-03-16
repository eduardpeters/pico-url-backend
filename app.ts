import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import ExpressMongoSanitize from 'express-mongo-sanitize';
import usersRoute from './src/routes/usersRoute.js';
import urlsRoute from './src/routes/urlsRoute.js';
import authRoute from './src/routes/authRoute.js';
import connectToDatabase from './src/db/connect.js';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());
app.use(ExpressMongoSanitize());

app.use('/api/users', usersRoute);
app.use('/api/auth', authRoute);
app.use('/api/urls', urlsRoute);
app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});

(async function startServer() {
    try {
        await connectToDatabase();
        app.listen(port, () => {
            console.log(`Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error(error);
    }
})();