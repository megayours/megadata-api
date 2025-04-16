import { createRoute } from "@hono/zod-openapi";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";
import { selectTokenConfig } from "./route-types";

export const getTokenConfig = createRoute({
  method: 'get',
  path: '/tokens',
  tags: ['Config'],
  summary: 'Get all token configs',
  responses: {
    [HTTP_STATUS_CODES.OK]: {
      content: {
        'application/json': {
          schema: selectTokenConfig
        }
      },
      description: 'List of token configs'
    }
  }
});