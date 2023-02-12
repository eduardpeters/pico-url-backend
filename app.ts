import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import usersRoute from './routes/users';
import authRoute from './routes/auth';

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

mongoose.connect(process.env.MONGODB_URI as string)
.then(() => console.log('Now connected to MongoDB!'))
.catch(error => console.error(error));

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});
app.use(express.json());
app.use('/api/users', usersRoute);
app.use('/api/auth', authRoute);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});