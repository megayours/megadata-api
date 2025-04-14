import { createRoute, z } from "@hono/zod-openapi";
import { error } from "@/lib/schemas";
import { SuccessResponseSchema } from "@/lib/schemas";
import { protectedRoute } from "@/lib/security";

export const uploadFileRoute = createRoute({
  method: 'post',
  path: '/upload-file',
  tags: ['File Upload'],
  security: protectedRoute,
  summary: 'Upload a file to the abstraction chain',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            file: z.string().describe('Base64 encoded file content'),
            contentType: z.string().describe('MIME type of the file')
          })
        }
      }
    }
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: SuccessResponseSchema.extend({
            hash: z.string().describe('File hash')
          })
        }
      },
      description: 'File uploaded successfully'
    },
    401: error('Unauthorized'),
    500: error('Internal server error')
  }
});

export type UploadFile = typeof uploadFileRoute; 