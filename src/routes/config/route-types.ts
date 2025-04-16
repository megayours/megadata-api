import { z } from "@hono/zod-openapi";

export type GetTokenConfigResponse = z.infer<typeof selectTokenConfig>;

export const selectTokenConfig = z.array(z.object({
  name: z.string(),
  token_types: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })),
}));
