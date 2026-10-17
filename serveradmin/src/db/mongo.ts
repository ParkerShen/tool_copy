import mongoose from 'mongoose';

const connectMongo = async (): Promise<void> => {
  if (process.env.MONGO_LOG_ENABLED !== 'true') {
    return;
  }

  const mongoUri = process.env.MONGO_LOG_URI;
  if (!mongoUri) {
    console.error('MongoDB log persistence is enabled, but MONGO_LOG_URI is not configured.');
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected.');
  } catch (error: any) {
    console.error('MongoDB connection failed:', error.message);
  }
};

export default connectMongo;
