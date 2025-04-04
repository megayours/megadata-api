import { z } from "zod";
import { 
  CreateMegadataCollectionSchema, 
  ErrorResponseSchema, 
  MegadataCollectionResponseSchema,
  CreateMegadataTokenSchema,
  UpdateMegadataTokenSchema,
  MegadataTokenResponseSchema,
  SuccessResponseSchema,
} from "./types";

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

export const getCollectionsRoute = {
  tags: ['megadata'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataCollectionResponseSchema.array()
        }
      },
      description: 'List of all collections'
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
}

export const createCollectionRoute = {
  tags: ['megadata'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMegadataCollectionSchema
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
      description: 'Collection created successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Invalid request'
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

export const getCollectionRoute = {
  tags: ['megadata'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataCollectionResponseSchema
        }
      },
      description: 'Collection details'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Collection not found'
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

export const updateCollectionRoute = {
  tags: ['megadata'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: UpdateCollectionSchema
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
      description: 'Collection updated successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Collection not found'
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

export const deleteCollectionRoute = {
  tags: ['megadata'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema
        }
      },
      description: 'Collection deleted successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Collection not found'
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

export const publishCollectionRoute = {
  tags: ['megadata'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.array(z.string())
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema
        }
      },
      description: 'Collection published successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Collection not found'
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

export const getCollectionTokensRoute = {
  tags: ['megadata'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataTokenResponseSchema.array()
        }
      },
      description: 'List of all tokens in the collection'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Collection not found'
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

export const createTokenRoute = {
  tags: ['megadata'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: CreateMegadataTokenSchema
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: MegadataTokenResponseSchema
        }
      },
      description: 'Token created successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Invalid request'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Collection not found'
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

export const getTokenRoute = {
  tags: ['megadata'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: MegadataTokenResponseSchema
        }
      },
      description: 'Token details'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Token not found'
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

export const updateTokenRoute = {
  tags: ['megadata'],
  request: {
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
      description: 'Token updated successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Token not found'
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

export const deleteTokenRoute = {
  tags: ['megadata'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema
        }
      },
      description: 'Token deleted successfully'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Token not found'
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