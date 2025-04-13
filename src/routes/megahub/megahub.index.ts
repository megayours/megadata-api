import { createRouter } from "@/lib/create-app";
import * as handlers from "./megahub.handlers";
import * as routes from "./megahub.routes";

const router = createRouter()
  .basePath("/megahub")
  .openapi(routes.uploadFileRoute, handlers.uploadFileHandler);

export default router; 