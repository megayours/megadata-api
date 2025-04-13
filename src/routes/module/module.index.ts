import { createRouter } from "@/lib/create-app";
import * as handlers from "./module.handlers";
import * as routes from "./module.routes";

const router = createRouter()
  .basePath("/modules")
  .openapi(routes.getModulesRoute, handlers.getModulesHandler)
  .openapi(routes.getModuleRoute, handlers.getModuleByIdHandler);

export default router; 