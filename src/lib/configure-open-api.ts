import { Scalar } from "@scalar/hono-api-reference";

import type { AppOpenAPI } from "./types";

import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("/api/doc", {
    openapi: "3.0.0",
    info: {
      title: packageJSON.name,
      version: packageJSON.version,
      description: packageJSON.description,
    },
  });

  app.get(
    "/api",
    Scalar({
      theme: "kepler",
      layout: "classic",
      defaultHttpClient: {
        targetKey: "js",
        clientKey: "fetch",
      },
      url: "/api/doc",
    }),
  );
}