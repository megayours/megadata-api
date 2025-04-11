import { createRoute, z } from '@hono/zod-openapi';
import {
  CreateMegadataTokenSchema,
  MegadataCollectionResponseSchema,
  MegadataTokenResponseSchema,
  UpdateMegadataCollectionSchema,
  UpdateMegadataTokenSchema,
  ExternalCollectionResponseSchema,
  CreateExternalCollectionSchema
} from './types';

export const CollectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  account_id: z.string(),
  is_published: z.boolean(),
  created_at: z.number(),
  updated_at: z.number(),
  modules: z.array(z.string()).optional()
});

export const NewCollectionSchema = z.object({
  name: z.string(),
  account_id: z.string(),
  modules: z.array(z.string()).optional()
});

export const UpdateCollectionSchema = z.object({
  name: z.string(),
  modules: z.array(z.string()).optional()
});

export const PublishCollectionSchema = z.object({
  token_ids: z.array(z.string()),
  all: z.boolean().optional().default(false)
});

// Get Collections
export const getCollectionsRoute = createRoute({
  method: 'get',
  path: '/collections',
  tags: ['Collections'],
  summary: 'Get all collections',
  request: {
    query: z.object({
      type: z.string().optional()
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(MegadataCollectionResponseSchema)
        }
      },
      description: 'List of collections'
    }
  }
});

// Create Collection
export const createCollectionRoute = createRoute({
  method: 'post',
  path: '/collections',
  tags: ['Collections'],
  summary: 'Create a new collection',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string()
          })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: MegadataCollectionResponseSchema
        }
      },
      description: 'Created collection'
    }
  }
});

// Get Collection
export const getCollectionRoute = createRoute({
  method: 'get',
  path: '/collections/{collection_id}',
  tags: ['Collections'],
  summary: 'Get a collection by ID',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataCollectionResponseSchema
        }
      },
      description: 'Collection details'
    }
  }
});

// Update Collection
export const updateCollectionRoute = createRoute({
  method: 'put',
  path: '/collections/{collection_id}',
  tags: ['Collections'],
  summary: 'Update a collection',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateMegadataCollectionSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataCollectionResponseSchema
        }
      },
      description: 'Updated collection'
    }
  }
});

// Delete Collection
export const deleteCollectionRoute = createRoute({
  method: 'delete',
  path: '/collections/{collection_id}',
  tags: ['Collections'],
  summary: 'Delete a collection',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean()
          })
        }
      },
      description: 'Collection deleted'
    }
  }
});

// Publish Collection
export const publishCollectionRoute = createRoute({
  method: 'put',
  path: '/collections/{collection_id}/publish',
  tags: ['Collections'],
  summary: 'Publish a collection',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            token_ids: z.array(z.string()).optional(),
            all: z.boolean().optional()
          })
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean()
          })
        }
      },
      description: 'Collection published'
    }
  }
});

// Get Collection Tokens
export const getCollectionTokensRoute = createRoute({
  method: 'get',
  path: '/collections/{collection_id}/tokens',
  tags: ['Tokens'],
  summary: 'Get tokens in a collection',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    }),
    query: z.object({
      page: z.string().transform(Number).optional(),
      limit: z.string().transform(Number).optional()
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            tokens: z.array(MegadataTokenResponseSchema),
            total: z.number(),
            page: z.number(),
            limit: z.number()
          })
        }
      },
      description: 'List of tokens'
    }
  }
});

// Create Token
export const createTokenRoute = createRoute({
  method: 'post',
  path: '/collections/{collection_id}/tokens',
  tags: ['Tokens'],
  summary: 'Create tokens in a collection',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    }),
    body: {
      content: {
        'application/json': {
          schema: z.array(CreateMegadataTokenSchema)
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.array(MegadataTokenResponseSchema)
        }
      },
      description: 'Created tokens'
    }
  }
});

// Get Token
export const getTokenRoute = createRoute({
  method: 'get',
  path: '/collections/{collection_id}/tokens/{token_id}',
  tags: ['Tokens'],
  summary: 'Get a token by ID',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number),
      token_id: z.string()
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataTokenResponseSchema
        }
      },
      description: 'Token details'
    }
  }
});

// Update Token
export const updateTokenRoute = createRoute({
  method: 'put',
  path: '/collections/{collection_id}/tokens/{token_id}',
  tags: ['Tokens'],
  summary: 'Update a token',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number),
      token_id: z.string()
    }),
    body: {
      content: {
        'application/json': {
          schema: UpdateMegadataTokenSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataTokenResponseSchema
        }
      },
      description: 'Updated token'
    }
  }
});

// Delete Token
export const deleteTokenRoute = createRoute({
  method: 'delete',
  path: '/collections/{collection_id}/tokens/{token_id}',
  tags: ['Tokens'],
  summary: 'Delete a token',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number),
      token_id: z.string()
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean()
          })
        }
      },
      description: 'Token deleted'
    }
  }
});

// Validate Token Permissions
export const validateTokenPermissionsRoute = createRoute({
  method: 'get',
  path: '/collections/{collection_id}/tokens/{token_id}/validate',
  tags: ['Tokens'],
  summary: 'Validate token modification permissions',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number),
      token_id: z.string()
    })
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            isValid: z.boolean(),
            error: z.string().optional()
          })
        }
      },
      description: 'Token permission validation result'
    },
    401: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      },
      description: 'Unauthorized'
    },
    404: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      },
      description: 'Token not found'
    }
  }
});

// **** External Collections ****

// Create External Collection
export const createExternalCollectionRoute = createRoute({
  method: 'post',
  path: '/external-collections',
  tags: ['External Collections'],
  summary: 'Create a new external collection',
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateExternalCollectionSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: ExternalCollectionResponseSchema
        }
      },
      description: 'Created external collection'
    }
  }
});