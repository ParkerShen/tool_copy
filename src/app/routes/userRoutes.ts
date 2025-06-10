import express from 'express';
import {
  createUser,
  updateUser,
  deleteUser,
  login,
  logout
} from '../controllers/user/post';
import {
  getUsers,
  getAllUserroles,
  captcha
} from '../controllers/user/get';
import { authenticateToken } from './authMiddleware';

const router = express.Router();

router.post('/login', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  login(req, res).catch(next); 
});
router.get('/captcha', captcha);
router.post('/logout', logout);
router.use(authenticateToken);
router.post('/create', createUser); 
router.get('/getUsers', getUsers);
router.get('/getAllUserroles', getAllUserroles); 
router.post('/update', updateUser);
router.post('/delete', deleteUser);

export default router;