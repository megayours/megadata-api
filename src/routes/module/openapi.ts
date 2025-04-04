import { createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { 
  ErrorResponseSchema, 
  ModuleResponseSchema,
  ValidationResponseSchema,
  ValidateRequestSchema
} from "./types";

export const getModulesRoute = {
  tags: ['modules'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ModuleResponseSchema.array()
        }
      },
      description: 'List of all modules'
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

export const getModuleRoute = {
  tags: ['modules'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ModuleResponseSchema
        }
      },
      description: 'Module details'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Module not found'
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

export const validateModuleRoute = {
  tags: ['modules'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ValidateRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ValidationResponseSchema
        }
      },
      description: 'Validation successful'
    },
    400: {
      content: {
        'application/json': {
          schema: ValidationResponseSchema
        }
      },
      description: 'Validation failed'
    },
    404: {
      content: {
        'application/json': {
          schema: ErrorResponseSchema
        }
      },
      description: 'Module not found'
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