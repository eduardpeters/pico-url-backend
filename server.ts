import dotenv from 'dotenv';
import app from './src/app.js';
import { connectToDatabase } from './src/db/connect.js';

dotenv.config();

const port = process.env.PORT;

(async function startServer() {
    try {
        await connectToDatabase();
        app.listen(port, (error?: Error) => {
            if (error) {
                console.error(error);
                return;
            }
            console.log(`Server is running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error(error);
    }
})();
