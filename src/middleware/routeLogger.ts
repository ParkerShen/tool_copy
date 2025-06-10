import { Request, Response, NextFunction } from 'express';
import moment from 'moment';

function routeLogger(req: Request, res: Response, next: NextFunction) {
  const now = moment();
  console.log(`[${req.method}] ${req.originalUrl} - ${now.format('YYYY-MM-DD HH:mm:ss')}`);
  next();
}

export default routeLogger;