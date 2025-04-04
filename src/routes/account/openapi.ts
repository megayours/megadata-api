import { CreateAccountSchema, AccountResponseSchema, ErrorResponseSchema, SuccessResponseSchema } from './types';

export const getAccountsRoute = {
  tags: ['account'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AccountResponseSchema.array()
        }
      },
      description: 'List of all accounts'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Internal server error'
    }
  }
};

export const getAccountRoute = {
  tags: ['account'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: AccountResponseSchema
        }
      },
      description: 'Account details'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Account not found'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Internal server error'
    }
  }
};

export const createAccountRoute = {
  tags: ['account'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateAccountSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: AccountResponseSchema
        }
      },
      description: 'Account created successfully'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Internal server error'
    }
  }
};

export const deleteAccountRoute = {
  tags: ['account'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema
        }
      },
      description: 'Account deleted successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Account not found'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Internal server error'
    }
  }
}; 