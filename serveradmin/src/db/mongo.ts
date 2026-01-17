import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectMongo = async (): Promise<void> => {
  try {
    // 使用环境变量或默认值，确保使用127.0.0.1而不是::1
    const mongoUri = process.env.MONGO_LOG_URI || 'mongodb://127.0.0.1:27017/logs';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB 已连接');
  } catch (error: any) {
    console.error('❌❌ MongoDB 连接失败:', error.message);
    // 在开发环境中不要退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectMongo;
