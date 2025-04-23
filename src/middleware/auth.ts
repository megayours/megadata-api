import type { MiddlewareHandler } from 'hono';
import { verifyToken, getWalletAddress } from '../config/jwt';
import env from '@/env';

export const ACCOUNT_ID_HEADER = 'X-Account-Id';
export const INTERNAL_API_KEY_HEADER = 'X-Internal-Api-Key';

interface SecurityRequirement {
  bearerAuth?: string[];
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const internalApiKey = c.req.header(INTERNAL_API_KEY_HEADER);
  const accountId = c.req.header(ACCOUNT_ID_HEADER);

  if (internalApiKey) {
    // Allow internal API key to bypass authentication
    if (internalApiKey !== env.INTERNAL_API_KEY) {
      return c.json({ error: 'Invalid internal API key' }, 401);
    }

    if (accountId) {
      c.set('walletAddress', accountId);
    }

    await next();
    return;
  } else if (accountId && env.NODE_ENV !== 'production') {
    // Allow account ID to bypass authentication in non-production environments
    c.set('walletAddress', accountId);
    await next();
    return;
  }

  const authHeader = c.req.header('Authorization');
  if (!internalApiKey || !authHeader) {
    // Check if route requires authentication
    const route = c.get('route');
    if (!route?.security?.some((sec: SecurityRequirement) => sec.bearerAuth)) {
      console.log('No authentication required');
      await next();
      return;
    }
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

  await next();
};
