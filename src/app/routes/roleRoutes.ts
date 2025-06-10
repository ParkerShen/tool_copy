import express from 'express';
import {
  createRole,
  updateRole,
  deleteRole
} from '../controllers/role/post';
import {
  getAllroles,
  getAllmenus
} from '../controllers/role/get';
import { authenticateToken } from './authMiddleware';

const router = express.Router();

router.use(authenticateToken);
router.get('/getAllroles', getAllroles);
router.get('/getAllmenus', getAllmenus);
router.post('/createRole', createRole);
router.post('/updateRole', updateRole);
router.post('/deleteRole', deleteRole);

export default router;