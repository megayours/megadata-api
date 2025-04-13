import { authMiddleware } from "@/middleware/auth";
import { pinoLogger } from "@/middleware/pino-logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Schema } from "hono";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import type { AppBindings, AppOpenAPI } from "./types";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
  });
}

export default function createApp() {
  const app = createRouter();
  app.use(requestId())
  app.use('*', cors());
  app.use('*', pinoLogger());

  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api')) {
      return next();
    }
    return authMiddleware(c, next);
  });
  return app;
}

export function createTestApp<S extends Schema>(router: AppOpenAPI<S>) {
  return createApp().route("/", router);
}