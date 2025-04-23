# API Token Testing

This task covers the implementation of tests for the API token functionality, including token generation, validation, and API endpoints.

## Completed Tasks
- [ ] None yet

## In Progress Tasks
- [ ] Design test strategy for API tokens
- [ ] Create unit test outline for token service

## Future Tasks
- [ ] Implement unit tests for API token service
- [ ] Implement integration tests for API token endpoints
- [ ] Add test for token authentication flow
- [ ] Create test for token expiration handling

## Implementation Plan

### Test Categories

1. **Unit Tests**
   - Token generation and validation
   - CRUD operations for tokens
   - Last accessed timestamp updates

2. **Integration Tests**
   - API endpoints for token management
   - Authentication middleware with API tokens

3. **Security Tests**
   - Token expiration handling
   - Rate limiting for token validation
   - Token revocation behavior

### Unit Tests for Token Service

```typescript
// src/tests/services/apiToken.service.test.ts
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ApiTokenService } from '../../services/apiToken.service';
import { db } from '../../db';
import { apiToken } from '../../db/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { ApiError } from '@/utils/errors';

describe('ApiTokenService', () => {
  const testAccount = { id: 'test-account-id', type: 'test' };
  
  // Clean up database before/after tests
  beforeEach(async () => {
    await db.delete(apiToken).execute();
  });
  
  afterEach(async () => {
    await db.delete(apiToken).execute();
  });
  
  describe('createToken', () => {
    it('should generate a token with mk_ prefix', async () => {
      const tokenData = await ApiTokenService.createToken({
        accountId: testAccount.id,
        name: 'Test Token',
      });
      
      expect(tokenData.token).toMatch(/^mk_[A-Za-z0-9]{24}$/);
    });
    
    it('should store a hashed token', async () => {
      const tokenData = await ApiTokenService.createToken({
        accountId: testAccount.id,
        name: 'Test Token',
      });
      
      // Get the stored token from the database
      const storedToken = await db.select().from(apiToken).where(eq(apiToken.id, tokenData.id)).limit(1).then(res => res[0]);
      
      // Verify that the stored hash matches the original token
      expect(await bcrypt.compare(tokenData.token, storedToken.token_hash)).toBe(true);
    });
    
    it('should respect token expiration', async () => {
      // Create a token that expires in 1 day
      const tokenData = await ApiTokenService.createToken({
        accountId: testAccount.id,
        name: 'Expiring Token',
        expiresIn: 1,
      });
      
      // Get the stored token from the database
      const storedToken = await db.select().from(apiToken).where(eq(apiToken.id, tokenData.id)).limit(1).then(res => res[0]);
      
      // Check that the expiration is set to approximately 1 day in the future
      const now = Math.floor(Date.now() / 1000);
      const oneDay = 24 * 60 * 60;
      
      expect(storedToken.expires_at).toBeDefined();
      expect(storedToken.expires_at).toBeGreaterThan(now);
      expect(storedToken.expires_at! - now).toBeCloseTo(oneDay, -2); // Allow some execution time variance
    });
  });
  
  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      // Create a token
      const tokenData = await ApiTokenService.createToken({
        accountId: testAccount.id,
        name: 'Valid Token',
      });
      
      // Validate the token
      const validationResult = await ApiTokenService.validateToken(tokenData.token);
      
      expect(validationResult.accountId).toBe(testAccount.id);
    });
    
    it('should reject an invalid token', async () => {
      // Try to validate a non-existent token
      try {
        await ApiTokenService.validateToken('mk_invalidtoken12345678901234');
        fail('Should have thrown an error for invalid token');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid API token');
      }
    });
    
    it('should reject an expired token', async () => {
      // Mock Date.now to simulate future time
      const realDateNow = Date.now;
      
      try {
        // Create a token that expires in 1 day
        const tokenData = await ApiTokenService.createToken({
          accountId: testAccount.id,
          name: 'Expiring Token',
          expiresIn: 1,
        });
        
        // Move time forward 2 days
        Date.now = jest.fn(() => realDateNow() + 2 * 24 * 60 * 60 * 1000);
        
        // Try to validate the expired token
        try {
          await ApiTokenService.validateToken(tokenData.token);
          fail('Should have thrown an error for expired token');
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toContain('Invalid API token');
        }
      } finally {
        // Restore original Date.now
        Date.now = realDateNow;
      }
    });
  });
  
  // Additional tests for other methods...
});
```

### Integration Tests for API Endpoints

```typescript
// src/tests/routes/api-tokens.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { app } from '../../index';
import { db } from '../../db';
import { apiToken } from '../../db/schema';
import { makeTestRequest, generateRandomAccount } from '../helpers';
import { eq } from 'drizzle-orm';

describe('API Token Endpoints', () => {
  const testAccount = generateRandomAccount();
  
  // Clean up database before/after tests
  beforeEach(async () => {
    await db.delete(apiToken).where(eq(apiToken.account_id, testAccount.id)).execute();
  });
  
  afterEach(async () => {
    await db.delete(apiToken).where(eq(apiToken.account_id, testAccount.id)).execute();
  });
  
  describe('POST /settings/api-tokens', () => {
    it('should create a new API token', async () => {
      const response = await makeTestRequest(app, '/settings/api-tokens', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Token',
          description: 'Test token description',
        }),
      });
      
      expect(response.status).toBe(201);
      
      const data = await response.json();
      expect(data.token).toBeDefined();
      expect(data.token).toMatch(/^mk_[A-Za-z0-9]{24}$/);
      expect(data.name).toBe('Test Token');
    });
  });
  
  describe('GET /settings/api-tokens', () => {
    it('should list all tokens for the account', async () => {
      // Create a token first
      const createResponse = await makeTestRequest(app, '/settings/api-tokens', {
        method: 'POST',
        body: JSON.stringify({
          name: 'List Test Token',
        }),
      });
      
      expect(createResponse.status).toBe(201);
      
      // Now list tokens
      const listResponse = await makeTestRequest(app, '/settings/api-tokens', {
        method: 'GET',
      });
      
      expect(listResponse.status).toBe(200);
      
      const data = await listResponse.json();
      expect(Array.isArray(data.tokens)).toBe(true);
      expect(data.tokens.length).toBeGreaterThanOrEqual(1);
      
      // Verify the token we created is in the list
      const createdToken = data.tokens.find(t => t.name === 'List Test Token');
      expect(createdToken).toBeDefined();
      expect(createdToken.token).toBeUndefined(); // Plain token should not be returned in list
    });
  });
  
  // Additional tests for other endpoints...
});
```

### Auth Middleware Tests

```typescript
// src/tests/middleware/auth.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { app } from '../../index';
import { db } from '../../db';
import { apiToken } from '../../db/schema';
import { ApiTokenService } from '../../services/apiToken.service';
import { generateRandomAccount } from '../helpers';
import { API_TOKEN_HEADER } from '../../middleware/auth';
import { eq } from 'drizzle-orm';

describe('Auth Middleware with API Tokens', () => {
  const testAccount = generateRandomAccount();
  let testToken: string;
  
  // Set up a token for testing
  beforeEach(async () => {
    await db.delete(apiToken).where(eq(apiToken.account_id, testAccount.id)).execute();
    
    const tokenData = await ApiTokenService.createToken({
      accountId: testAccount.id,
      name: 'Auth Test Token',
    });
    
    testToken = tokenData.token;
  });
  
  afterEach(async () => {
    await db.delete(apiToken).where(eq(apiToken.account_id, testAccount.id)).execute();
  });
  
  it('should authenticate with a valid API token', async () => {
    // Make a request to a protected endpoint with the API token
    const response = await fetch(new URL('/settings/api-tokens', 'http://localhost'), {
      headers: {
        [API_TOKEN_HEADER]: testToken,
      },
    });
    
    expect(response.status).toBe(200);
  });
  
  it('should reject with an invalid API token', async () => {
    // Make a request with an invalid token
    const response = await fetch(new URL('/settings/api-tokens', 'http://localhost'), {
      headers: {
        [API_TOKEN_HEADER]: 'mk_invalidtoken12345678901234',
      },
    });
    
    expect(response.status).toBe(401);
  });
  
  it('should update last_accessed timestamp on successful auth', async () => {
    // Make a request with the token
    await fetch(new URL('/settings/api-tokens', 'http://localhost'), {
      headers: {
        [API_TOKEN_HEADER]: testToken,
      },
    });
    
    // Wait a moment for the background update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Get the token from the database and check last_accessed
    const storedTokens = await db.select().from(apiToken).where(
      eq(apiToken.account_id, testAccount.id)
    ).limit(1).then(res => res[0]);
    
    expect(storedTokens).toBeDefined();
    expect(storedTokens.last_accessed).toBeDefined();
    
    // Last accessed should be recent
    const now = Math.floor(Date.now() / 1000);
    expect(now - storedTokens.last_accessed!).toBeLessThan(10); // Within 10 seconds
  });
});
```

### Test Error Handling

For testing error scenarios, we'll use try/catch blocks and expect the appropriate errors to be thrown:

```typescript
it('should throw an error when token not found', async () => {
  try {
    await ApiTokenService.getToken('non-existent-id', testAccount.id);
    fail('Should have thrown an error for non-existent token');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(HTTP_STATUS_CODES.NOT_FOUND);
  }
});
```

## Relevant Files
- src/tests/services/apiToken.service.test.ts
- src/tests/routes/api-tokens.test.ts
- src/tests/middleware/auth.test.ts 