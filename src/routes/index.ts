import { Elysia } from "elysia";
import { megadataRoutes } from "./megadata";
import { accountRoutes } from "./account";

export const routes = new Elysia()
  .use(megadataRoutes)
  .use(accountRoutes); 