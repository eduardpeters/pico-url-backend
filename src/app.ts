import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import usersRoute from './routes/usersRoute.js';
import urlsRoute from './routes/urlsRoute.js';
import authRoute from './routes/authRoute.js';

const app: Express = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api/users', usersRoute);
app.use('/api/auth', authRoute);
app.use('/api/urls', urlsRoute);
app.get('/health', (req: Request, res: Response) => {
    res.send('OK');
});

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});

export default app;
