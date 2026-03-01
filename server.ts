import 'dotenv/config';
import app from './src/app.js';
import { connectToDatabase } from './src/db/connect.js';

const port = Number(process.env.PORT);

(async function startServer() {
    try {
        await connectToDatabase();
        app.listen(port, '0.0.0.0', (error?: Error) => {
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
