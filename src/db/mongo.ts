import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectMongo = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_LOG_URI as any) 
    console.log('✅ MongoDB 已连接');
  } catch (error: any) {
    console.error('❌❌ MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

export default connectMongo;