import { createRouter } from "@/lib/create-app";

import * as handlers from "./config.handlers";
import * as routes from "./config.routes";

const router = createRouter()
  .basePath("/config")
  .openapi(routes.getTokenConfig, handlers.getTokenConfig);

export default router;