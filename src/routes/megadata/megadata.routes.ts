import { createRoute, z } from "@hono/zod-openapi";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";
import { insertCollectionsSchema, selectCollectionsSchema, selectExternalCollectionSchema } from "@/db/schema";
import { 
  MegadataTokenResponseSchema, 
  CreateMegadataTokenSchema, 
  UpdateMegadataTokenSchema
} from "./types";
import { error, SuccessResponseSchema } from "@/lib/schemas";

export const getCollections = createRoute({
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
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: z.array(selectCollectionsSchema)
        }
      },
      description: 'List of collections'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized')
  }
});

export const getCollection = createRoute({
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
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: selectCollectionsSchema
        }
      },
      description: 'Collection details'
    },
    [HTTP_STATUS_CODES.NOT_FOUND]: {
      description: 'Collection not found',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string()
          })
        }
      }
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized')
  }
});

export const createCollection = createRoute({
  method: 'post',
  path: '/collections',
  tags: ['Collections'],
  summary: 'Create a new collection',
  request: {
    body: {
      content: {
        'application/json': {
          schema: insertCollectionsSchema
        }
      }
    }
  },
  responses: {
    [HTTP_STATUS_CODES.CREATED]: {
      content: {
        'application/json': {
          schema: selectCollectionsSchema
        }
      },
      description: 'Created collection'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized')
  }
});

export const createExternalCollection = createRoute({
  method: 'post',
  path: '/external-collections',
  tags: ['Collections'],
  summary: 'Create a new external collection',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            source: z.string(),
            id: z.string(),
            type: z.string()
          })
        }
      }
    }
  },
  responses: {
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: selectCollectionsSchema
        }
      },
      description: 'External collection already exists'
    },
    [HTTP_STATUS_CODES.CREATED]: {
      content: {
        'application/json': {
          schema: selectCollectionsSchema
        }
      },
      description: 'Created external collection'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized')
  }
});

export const getExternalCollection = createRoute({
  method: 'get',
  path: '/external-collections/{collection_id}',
  tags: ['Collections'],
  summary: 'Get an external collection by ID',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    })
  },
  responses: {
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: selectExternalCollectionSchema
        }
      },
      description: 'External collection details'
    },
    [HTTP_STATUS_CODES.NOT_FOUND]: error('External collection not found'),
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized')
  }
});

export const publishCollection = createRoute({
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
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean()
          })
        }
      },
      description: 'Collection published'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized'),
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Collection not found')
  }
});

export const getCollectionTokens = createRoute({
  method: 'get',
  path: '/collections/{collection_id}/tokens',
  tags: ['Tokens'],
  summary: 'Get tokens in a collection',
  request: {
    params: z.object({
      collection_id: z.string().transform(Number)
    }),
    query: z.object({
      page: z.string().transform(Number).refine((val) => val > 0, { message: "Page must be greater than 0" }).default('1'),
      limit: z.string().transform(Number).refine((val) => val > 0, { message: "Limit must be greater than 0" }).default('20')
    })
  },
  responses: {
    [HTTP_STATUS_CODES.OK]: {
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
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized'),
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Collection not found'),
    [HTTP_STATUS_CODES.BAD_REQUEST]: error('Invalid request parameters'),
    [HTTP_STATUS_CODES.FORBIDDEN]: error('Access denied'),
  }
});

export const getToken = createRoute({
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
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: MegadataTokenResponseSchema
        }
      },
      description: 'Token details'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized'),
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Token not found'),
    [HTTP_STATUS_CODES.FORBIDDEN]: error('Access denied'),
  }
});

export const createToken = createRoute({
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
    [HTTP_STATUS_CODES.CREATED]: {
      content: {
        'application/json': {
          schema: z.array(MegadataTokenResponseSchema)
        }
      },
      description: 'Created tokens'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized'),
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Collection not found'),
    [HTTP_STATUS_CODES.BAD_REQUEST]: error('Invalid request parameters'),
    [HTTP_STATUS_CODES.FORBIDDEN]: error('Access denied'),
    [HTTP_STATUS_CODES.METHOD_NOT_ALLOWED]: error('Operation not allowed'),
  }
});

export const updateToken = createRoute({
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
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: MegadataTokenResponseSchema
        }
      },
      description: 'Updated token'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized'),
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Token not found'),  
    [HTTP_STATUS_CODES.BAD_REQUEST]: error('Invalid request parameters'),
    [HTTP_STATUS_CODES.FORBIDDEN]: error('Access denied'),
    [HTTP_STATUS_CODES.METHOD_NOT_ALLOWED]: error('Operation not allowed'),
  }
});

export const deleteToken = createRoute({
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
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema
        }
      },
      description: 'Token deleted'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized'),
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Token not found'),
    [HTTP_STATUS_CODES.FORBIDDEN]: error('Access denied'),
    [HTTP_STATUS_CODES.METHOD_NOT_ALLOWED]: error('Operation not allowed'),
  }
});

export const validateTokenPermissions = createRoute({
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
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: z.object({
            isValid: z.boolean(),
            error: z.string().optional()
          })
        }
      },
      description: 'Validation result'
    },
    [HTTP_STATUS_CODES.UNAUTHORIZED]: error('Unauthorized'),
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Token not found'),
    [HTTP_STATUS_CODES.BAD_REQUEST]: error('Invalid request parameters'),
    [HTTP_STATUS_CODES.FORBIDDEN]: error('Access denied'),
  }
});

export type GetCollections = typeof getCollections;
export type CreateCollection = typeof createCollection;
export type CreateExternalCollection = typeof createExternalCollection;
export type GetExternalCollection = typeof getExternalCollection;
export type GetCollection = typeof getCollection;
export type PublishCollection = typeof publishCollection;
export type GetCollectionTokens = typeof getCollectionTokens;
export type GetToken = typeof getToken;
export type CreateToken = typeof createToken;
export type UpdateToken = typeof updateToken;
export type DeleteToken = typeof deleteToken;
export type ValidateTokenPermissions = typeof validateTokenPermissions;