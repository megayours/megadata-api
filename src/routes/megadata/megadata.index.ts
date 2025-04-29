import { createRouter } from "@/lib/create-app";

import * as handlers from "./megadata.handlers";
import * as routes from "./megadata.routes";

const router = createRouter()
  .basePath("/megadata")
  .openapi(routes.getCollections, handlers.getCollections)
  .openapi(routes.createCollection, handlers.createCollection)
  .openapi(routes.createExternalCollection, handlers.createExternalCollection)
  .openapi(routes.getExternalCollection, handlers.getExternalCollection)
  .openapi(routes.getCollection, handlers.getCollection)
  .openapi(routes.publishCollection, handlers.publishCollection)
  .openapi(routes.getCollectionTokens, handlers.getCollectionTokens)
  .openapi(routes.getToken, handlers.getToken)
  .openapi(routes.createToken, handlers.createToken)
  .openapi(routes.updateToken, handlers.updateToken)
  .openapi(routes.validateTokenPermissions, handlers.validateTokenPermissions)
  .openapi(routes.getRandomTokensByAttribute, handlers.getRandomTokensByAttribute)
  .openapi(routes.getExternalCollections, handlers.getExternalCollections);

export default router;