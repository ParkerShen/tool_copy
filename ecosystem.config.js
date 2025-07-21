module.exports = {
  apps: [{
    name: 'xin-server',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'localhost',
      DB_USER: 'xin',
      DB_PASSWORD: '123456',
      DB_NAME: 'xin',
      DB_PORT: '3306',
      MONGO_LOG_URI: 'mongodb://127.0.0.1:27017/logs',
      JWT_SECRET: 'shenserver',
      SESSION_SECRET: 'secure_random_string_here'
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2-combined.log',
    time: true
  }]
};