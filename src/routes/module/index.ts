import { OpenAPIHono } from '@hono/zod-openapi';
import type { StatusCode } from 'hono/utils/http-status';
import { getModules, getModuleById, validateTokenData } from "../../services/module";
import { getModulesRoute, getModuleRoute, validateModuleRoute } from "./openapi";

const app = new OpenAPIHono();

app.openapi(
  { ...getModulesRoute, method: 'get', path: '/' },
  async (c) => {
    const result = await getModules();
    if (result.isErr()) {
      c.status(result.error.status as StatusCode);
      return c.json({ error: result.error.message }) as any;
    }
    return c.json(result.value);
  }
);

app.openapi(
  { ...getModuleRoute, method: 'get', path: '/:id' },
  async (c) => {
    const id = c.req.param("id") as string;
    const result = await getModuleById(id);
    if (result.isErr()) {
      c.status(result.error.status as StatusCode);
      return c.json({ error: result.error.message }) as any;
    }
    if (result.value.length === 0) {
      c.status(404);
      return c.json({ error: "Module not found" }) as any;
    }
    return c.json(result.value[0]);
  }
);

app.openapi(
  { ...validateModuleRoute, method: 'post', path: '/:id/validate' },
  async (c) => {
    const id = c.req.param("id") as string;
    const data = await c.req.json();
    const result = await validateTokenData(data, id);
    if (result.isErr()) {
      c.status(400);
      return c.json({ valid: false, errors: [result.error.message] }) as any;
    }
    return c.json({ valid: true });
  }
);

export const moduleRoutes = app; 