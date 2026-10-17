import dotenv from 'dotenv';
import path from 'path';

const environment = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = environment;

dotenv.config({
  path: path.resolve(__dirname, '../../.env.' + environment),
});
