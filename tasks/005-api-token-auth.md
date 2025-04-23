# API Token Authentication Implementation

This task covers updating the authentication middleware to support API tokens as an alternative to JWT authentication.

## Completed Tasks
- [ ] None yet

## In Progress Tasks
- [ ] Design authentication flow for API tokens
- [ ] Update auth middleware to check for API token header

## Future Tasks
- [ ] Implement token validation service
- [ ] Add last_accessed tracking when tokens are used
- [ ] Add rate limiting for API token authentication
- [ ] Create tests for API token authentication flow

## Implementation Plan

### Authentication Flow

1. Add a new header for API token authentication: `X-API-Token`
2. Update the auth middleware to check for this header before checking for the JWT Authorization header
3. If the API token header is present, validate it against the database
4. If valid, set the account ID in the request context and update the token's last_accessed timestamp
5. If invalid, fall back to JWT authentication

### Auth Middleware Updates

The `auth.ts` file needs to be updated to support API token authentication:

```typescript
import type { MiddlewareHandler } from 'hono';
import { verifyToken, getWalletAddress } from '../config/jwt';
import { ApiTokenService } from '../services/apiToken.service';

export const TEST_BYPASS_AUTH_HEADER = 'X-Test-Wallet-Address';
export const API_TOKEN_HEADER = 'X-API-Token';

interface SecurityRequirement {
  bearerAuth?: string[];
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Test environment bypass
  if (process.env.NODE_ENV !== 'production') {
    const testBypassAuthHeader = c.req.header(TEST_BYPASS_AUTH_HEADER);
    if (testBypassAuthHeader) {
      console.log('Test bypass auth header found');
      c.set('walletAddress', testBypassAuthHeader);
      await next();
      return;
    }
  }

  // Check for API token authentication
  const apiToken = c.req.header(API_TOKEN_HEADER);
  if (apiToken) {
    const tokenValidation = await ApiTokenService.validateToken(apiToken);
    
    if (tokenValidation.isOk()) {
      const { accountId } = tokenValidation.value;
      c.set('walletAddress', accountId);
      
      // Update last_accessed timestamp in the background
      ApiTokenService.updateLastAccessed(apiToken).catch(err => {
        console.error('Failed to update last_accessed timestamp:', err);
      });
      
      await next();
      return;
    }
    // If API token validation fails, fall through to JWT auth
  }

  // Existing JWT authentication logic
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
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
```

### API Token Service Interface

The API Token Service needs to provide these key methods:

```typescript
// src/services/apiToken.service.ts

interface ValidateTokenResult {
  accountId: string;
  tokenId: string;
}

export class ApiTokenService {
  static validateToken(token: string): Promise<ValidateTokenResult> {
    // Implementation to validate token against database
  }
  
  static updateLastAccessed(token: string): Promise<void> {
    // Implementation to update last_accessed timestamp
  }
  
  // Other methods for token CRUD operations
}
```

## Relevant Files
- src/middleware/auth.ts - Update to support API token authentication
- src/services/apiToken.service.ts - New service for token operations and validation 