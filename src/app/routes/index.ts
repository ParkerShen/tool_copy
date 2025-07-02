import express from 'express';
import userRoutes from './userRoutes';
import roleRoutes from './roleRoutes';
import uploadRoutes from './uploadRoutes';
import menuRoutes from './menuRoutes';
const router = express.Router();

router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/menus', menuRoutes);
router.use('/uploads', uploadRoutes); 

export default router;