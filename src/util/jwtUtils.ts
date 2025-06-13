import jwt from 'jsonwebtoken';
import db from '../app/models/platform';
const { User, Role } = db;

interface TokenPayload {
  [key: string]: any;
}

export const generateToken = async (username: string): Promise<string> => {
  if (!username) throw new Error('Username is required');
  
  const user = await User.findOne({
    where: { username, deleted: 0 },
    include: [{ model: Role }],
    raw: true,
    nest: true
  }as any);

  if (!user) throw new Error('User not found');
  
  const payload: TokenPayload = user;
  const secretKey = 'shenserver';
  const options = { expiresIn: '1d' };
  
  return jwt.sign(payload, secretKey, options);
};