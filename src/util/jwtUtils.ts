import jwt from 'jsonwebtoken';
import db from '../app/models/platform';
// 导入客户端模型（需要创建）
import clientDb from '../app/models/client';

const { User, Role } = db;
const { User: ClientUser } = clientDb;

interface TokenPayload {
  [key: string]: any;
}

export const generateToken = async (
  username: string, 
  clientType: 'platform' | 'client' | 'miniapp' = 'platform'
): Promise<string> => {
  if (!username) throw new Error('Username is required');
  
  // 根据clientType选择不同的用户模型
  const UserModel = clientType === 'platform' ? User : ClientUser;
  
  const user = await UserModel.findOne({
    where: { username, deleted: 0 },
    include: clientType === 'platform' ? [{ model: Role }] : [],
    raw: true,
    nest: true
  } as any);

  if (!user) throw new Error('User not found');
  
  const payload: TokenPayload = {
    ...user,
    clientType,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const secretKey = process.env.JWT_SECRET || 'shenserver';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  
  return jwt.sign(payload, secretKey, { expiresIn });
};
