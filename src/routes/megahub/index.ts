import { OpenAPIHono } from "@hono/zod-openapi";
import { uploadFileRoute } from "./openapi";
import { AbstractionChainService } from "../../services/abstraction-chain.service";
import { FsFile, type ContentType } from "filehub";

const app = new OpenAPIHono();

app.openapi({
  ...uploadFileRoute, method: 'post', path: '/upload-file'
}, async (c) => {
  const { file, contentType, account } = c.req.valid('json');
  const fileBuffer = Buffer.from(file, 'base64');

  const fsFile = FsFile.fromData(fileBuffer, { 'Content-Type': contentType as ContentType });
  
  const result = await AbstractionChainService.uploadFile(fsFile.data, contentType, account);
  if (result.isErr()) {
    return c.json({ error: result.error.message }, 500);
  }

  return c.json({ hash: fsFile.hash.toString('hex') }, 201);
});

export {
  app as megahubRoutes
}