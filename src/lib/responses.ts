import type { Context } from "hono";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";

export const unauthorized = (c: Context) => {
  return c.json({ error: "The user is not authorized to access this resource." }, HTTP_STATUS_CODES.UNAUTHORIZED);
}
