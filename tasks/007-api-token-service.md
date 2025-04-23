# API Token Service Implementation

This task covers the implementation of the API token service responsible for token generation, validation, and management.

## Completed Tasks
- [ ] None yet

## In Progress Tasks
- [ ] Define API token service interface
- [ ] Implement token generation utility

## Future Tasks
- [ ] Implement token validation logic
- [ ] Implement token CRUD operations
- [ ] Add token last_accessed tracking
- [ ] Create unit tests for API token service

## Implementation Plan

### Service Interface

The API Token Service will provide the following methods:

```typescript
// src/services/apiToken.service.ts
import { Promise, Result, ok, err } from 'neverthrow';
import { db } from '../db';
import { apiToken } from '../db/schema';
import { handleDatabaseError } from '../db/helpers';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface ApiToken {
  id: string;
  account_id: string;
  name: string;
  last_accessed?: number;
  expires_at?: number;
  created_at: number;
  updated_at: number;
}

export interface ApiTokenWithPlainText extends ApiToken {
  token: string; // Plain text token, only returned on creation
}

export interface CreateTokenParams {
  accountId: string;
  name: string;
  expiresIn?: number; // Days until expiration
}

export interface ValidateTokenResult {
  accountId: string;
  tokenId: string;
}

export class ApiTokenService {
  // Generate and create a new API token
  static createToken(params: CreateTokenParams): Promise<ApiTokenWithPlainText> {
    // Implementation
  }
  
  // List all tokens for an account
  static listTokens(accountId: string): Promise<ApiToken[]> {
    // Implementation
  }
  
  // Get token details
  static getToken(tokenId: string, accountId: string): Promise<ApiToken> {
    // Implementation
  }
  
  // Revoke a token
  static revokeToken(tokenId: string, accountId: string): Promise<void> {
    // Implementation
  }
  
  // Validate a token for authentication
  static validateToken(token: string): Promise<ValidateTokenResult> {
    // Implementation
  }
  
  // Update the last_accessed timestamp
  static updateLastAccessed(token: string): Promise<void> {
    // Implementation
  }
}
```

### Implementation Details

#### Token Generation

```typescript
// Helper to generate and hash tokens
private static generateToken(): { token: string; hash: string } {
  // Generate a random token with the mk_ prefix
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 characters in base64
  const token = `mk_${randomBytes.toString('base64').replace(/\+/g, '').replace(/\//g, '').replace(/=+$/, '').substring(0, 24)}`;
  
  // Hash the token for storage
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(token, salt);
  
  return { token, hash };
}

static createToken(params: CreateTokenParams): Promise<ApiTokenWithPlainText> {
  return Promise.fromPromise(
    (async () => {
      const { token, hash } = this.generateToken();
      const tokenId = uuidv4();
      
      // Calculate expiration timestamp if expiresIn is provided
      let expiresAt: number | undefined = undefined;
      if (params.expiresIn) {
        const now = Math.floor(Date.now() / 1000);
        expiresAt = now + (params.expiresIn * 24 * 60 * 60); // Convert days to seconds
      }
      
      const result = await db.insert(apiToken).values({
        id: tokenId,
        token_hash: hash,
        account_id: params.accountId,
        name: params.name,
        expires_at: expiresAt,
      }).returning().then(res => res[0]);
      
      if (!result) {
        throw new Error('Failed to create API token');
      }
      
      return {
        ...result,
        token, // Include plain text token in response
      };
    })(),
    (error) => handleDatabaseError(error)
  );
}
```

#### Token Validation

```typescript
static validateToken(token: string): Promise<ValidateTokenResult> {
  return Promise.fromPromise(
    (async () => {
      // First, get all active tokens
      const tokens = await db.select().from(apiToken).where(
        and(
          eq(apiToken.is_active, true),
        )
      );
      
      // Check if token matches any of the hashed tokens
      for (const storedToken of tokens) {
        try {
          const isMatch = await bcrypt.compare(token, storedToken.token_hash);
          
          if (isMatch) {
            // Check if token is expired
            if (storedToken.expires_at && storedToken.expires_at < Math.floor(Date.now() / 1000)) {
              continue; // Skip expired tokens
            }
            
            return {
              accountId: storedToken.account_id,
              tokenId: storedToken.id,
            };
          }
        } catch (e) {
          console.error('Error comparing token hash:', e);
          // Continue to the next token
        }
      }
      
      throw new Error('Invalid API token');
    })(),
    (error) => error
  );
}
```

#### Update Last Accessed

```typescript
static async updateLastAccessed(token: string): Promise<void> {
  try {
    // First validate and get the token ID
    const validation = await this.validateToken(token);
    
    if (validation.isOk()) {
      const { tokenId } = validation.value;
      const now = Math.floor(Date.now() / 1000);
      
      // Update the last_accessed timestamp
      await db.update(apiToken)
        .set({ last_accessed: now, updated_at: now })
        .where(eq(apiToken.id, tokenId));
    }
  } catch (error) {
    console.error('Failed to update last_accessed timestamp:', error);
    // This is a background operation, so we don't throw errors
  }
}
```

## Performance Considerations

When validating tokens, we need to compare the provided token with all stored token hashes, which could become a performance issue as the number of tokens grows. Potential optimizations include:

1. **Token Prefix Cache**: Store token prefixes in a separate lookup table
2. **Rate Limiting**: Implement rate limiting for token validation attempts
3. **Caching**: Cache valid tokens for a short period (with security considerations)

## Security Considerations

1. Tokens are never stored in plain text
2. Use bcrypt for secure hashing
3. Always check token expiration
4. Only return the plain text token once during creation
5. Implement background token cleanup for expired tokens

## Relevant Files
- src/services/apiToken.service.ts - New service for token operations
- src/db/schema.ts - API token table schema 