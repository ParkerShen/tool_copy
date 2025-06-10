import express from 'express';
import userRoutes from './userRoutes';
import roleRoutes from './roleRoutes';
import uploadRoutes from './uploadRoutes';

const router = express.Router();

router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/uploads', uploadRoutes);

export default router;