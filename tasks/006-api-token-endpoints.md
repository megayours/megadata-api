# API Token Management Endpoints

This task covers creating API endpoints for managing API tokens, including creating, listing, viewing, and revoking tokens.

## Completed Tasks
- [ ] None yet

## In Progress Tasks
- [ ] Define API routes for token management
- [ ] Create request/response schemas

## Future Tasks
- [ ] Implement token creation endpoint
- [ ] Implement token listing endpoint
- [ ] Implement token deletion endpoint
- [ ] Add token usage statistics endpoint
- [ ] Create tests for API token management endpoints

## Implementation Plan

### API Routes Structure

Create a new set of routes under `/settings/api-tokens` with the following endpoints:

1. `GET /settings/api-tokens` - List all tokens for the authenticated account
2. `POST /settings/api-tokens` - Create a new API token
3. `GET /settings/api-tokens/:id` - Get details for a specific token
4. `DELETE /settings/api-tokens/:id` - Revoke a token

### Route Implementation

```typescript
// src/routes/settings/api-tokens.ts
import { Hono } from 'hono';
import { z } from 'zod';
import { ApiTokenService } from '../../services/apiToken.service';
import { zValidator } from '@hono/zod-validator';

const apiTokensRouter = new Hono();

// List all tokens for the authenticated account
apiTokensRouter.get('/', async (c) => {
  const accountId = c.get('walletAddress');
  const result = await ApiTokenService.listTokens(accountId);
  
  if (result.isErr()) {
    return c.json({ error: result.error.message }, 500);
  }
  
  return c.json({ tokens: result.value });
});

// Create a new API token
const createTokenSchema = z.object({
  name: z.string().min(1).max(64),
  expiresIn: z.number().optional(), // Days until expiration
});

apiTokensRouter.post('/', zValidator('json', createTokenSchema), async (c) => {
  const accountId = c.get('walletAddress');
  const { name, description, expiresIn } = c.req.valid('json');
  
  const result = await ApiTokenService.createToken({
    accountId,
    name,
    description,
    expiresIn,
  });
  
  // Only return the plain text token on creation
  return c.json({
    token: result.token,
    id: result.id,
    name: result.name,
    createdAt: result.created_at,
  }, 201);
});

// Get token details
apiTokensRouter.get('/:id', async (c) => {
  const accountId = c.get('walletAddress');
  const tokenId = c.req.param('id');
  
  const result = await ApiTokenService.getToken(tokenId, accountId);
  
  return c.json({ token: result });
});

// Revoke a token
apiTokensRouter.delete('/:id', async (c) => {
  const accountId = c.get('walletAddress');
  const tokenId = c.req.param('id');
  
  await ApiTokenService.revokeToken(tokenId, accountId);
  
  return c.json({ success: true });
});

export default apiTokensRouter;
```

### Response Types

The API responses should follow these formats:

1. List Tokens Response:
```typescript
interface TokenListResponse {
  tokens: Array<{
    id: string;
    name: string;
    last_accessed?: number; // timestamp
    expires_at?: number; // timestamp
    created_at: number; // timestamp
  }>;
}
```

2. Create Token Response:
```typescript
interface CreateTokenResponse {
  token: string; // Plain text token (only returned once)
  id: string;
  name: string;
  createdAt: number; // timestamp
}
```

3. Token Details Response:
```typescript
interface TokenDetailsResponse {
  token: {
    id: string;
    name: string;
    last_accessed?: number; // timestamp
    expires_at?: number; // timestamp
    created_at: number; // timestamp
    updated_at: number; // timestamp
  };
}
```

## Integration with Main Router

The API token routes need to be integrated with the main application router:

```typescript
// src/routes/index.ts
import { Hono } from 'hono';
import apiTokensRouter from './settings/api-tokens';

const router = new Hono();

// ... other routes

// Add API token management routes
router.route('/settings/api-tokens', apiTokensRouter);

export default router;
```

## Relevant Files
- src/routes/settings/api-tokens.ts - New routes for token management
- src/routes/index.ts - Integration with main router
- src/services/apiToken.service.ts - Service methods for token operations 