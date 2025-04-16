import type { AppRouteHandler } from "@/lib/types";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";
import type { GetTokenConfigResponse } from "./route-types";
import { tokenConfig } from "@/config/token-config";
import type { Context } from "hono";
import type { AppBindings } from "@/lib/types";

export const getTokenConfig = async (c: Context<AppBindings>) => {
  const config = Object.keys(tokenConfig)
    .filter((key) => tokenConfig[key] !== undefined)
    .map((key) => ({
      name: key,
      token_types: tokenConfig[key]!.token_types.map((token_type) => ({
        name: token_type.name,
        type: token_type.type,
      })),
    }));

  return c.json(config, HTTP_STATUS_CODES.OK);
};
