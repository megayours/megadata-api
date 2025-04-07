import type { MiddlewareHandler } from 'hono';
import { verifyToken, getWalletAddress } from '../config/jwt';

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Authorization header is required' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const appPubKey = c.req.header('x-app-pub-key');
  
  const verifyResult = await verifyToken(token, appPubKey);
  
  if (verifyResult.isErr()) {
    return c.json({ error: 'Invalid token' }, 401);
  }

  const payload = verifyResult.value;
  const walletAddress = getWalletAddress(payload, appPubKey);

  if (!walletAddress) {
    return c.json({ error: 'No wallet address found in token' }, 401);
  }

  // Add wallet address to context for use in route handlers
  c.set('walletAddress', walletAddress);
  console.log('walletAddress', walletAddress);

  await next();
};
