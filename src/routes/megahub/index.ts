import { OpenAPIHono } from "@hono/zod-openapi";
import { uploadFileRoute } from "./openapi";
import { AbstractionChainService } from "../../services/abstraction-chain.service";
import { SHA256 } from "bun";

const app = new OpenAPIHono();

app.openapi({
  ...uploadFileRoute, method: 'post', path: '/upload-file'
}, async (c) => {
  const { file, contentType, account } = c.req.valid('json');
  const fileBuffer = Buffer.from(file, 'base64');
  
  const result = await AbstractionChainService.uploadFile(fileBuffer, contentType, account);
  if (result.isErr()) {
    return c.json({ error: result.error.message }, 500);
  }

  const hash = Buffer.from(SHA256.hash(file).buffer).toString('hex');
  return c.json({ hash }, 201);
});

export {
  app as megahubRoutes
}