import mongoose from 'mongoose';

async function connectToDatabase() {
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB connection established!');
}

export default connectToDatabase;