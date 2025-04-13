import { createRoute, z } from "@hono/zod-openapi";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";
import { error } from "@/lib/schemas";

export const getModulesRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Modules'],
  summary: 'Get all modules',
  responses: {
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: z.array(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            version: z.string(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime()
          }))
        }
      },
      description: 'List of modules'
    }
  }
});

export const getModuleRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Modules'],
  summary: 'Get module by ID',
  request: {
    params: z.object({
      id: z.string()
    })
  },
  responses: {
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
            version: z.string(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime()
          })
        }
      },
      description: 'Module details'
    },
    [HTTP_STATUS_CODES.NOT_FOUND]: error('Module not found'),
  }
});

export type GetModules = typeof getModulesRoute;
export type GetModule = typeof getModuleRoute; 