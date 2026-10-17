import mongoose from 'mongoose';

const connectMongo = async (): Promise<void> => {
  try {
    // Use env var or default; prefer 127.0.0.1 to avoid IPv6 ::1 issues. 使用环境变量或默认值，确保使用127.0.0.1而不是::1
    const mongoUri = process.env.MONGO_LOG_URI || 'mongodb://127.0.0.1:27017/logs';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected.');  // MongoDB 已连接
  } catch (error: any) {
    console.error('MongoDB connection failed:', error.message); // ❌❌ MongoDB 连接失败
    // Do not exit in development. 在开发环境中不要退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

export default connectMongo;