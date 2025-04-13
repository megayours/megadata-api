import { db } from "@/db";
import { module } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AppRouteHandler } from "@/lib/types";
import type { GetModule, GetModules } from "./module.routes";
import * as HTTP_STATUS_CODES from "@/lib/http-status-codes";

export const getModulesHandler: AppRouteHandler<GetModules> = async (c) => {
  const modules = await db.select().from(module);
  return c.json(modules);
};

export const getModuleByIdHandler: AppRouteHandler<GetModule> = async (c) => {
  const { id } = c.req.valid("param");
  const foundModule = await db.select()
    .from(module)
    .where(eq(module.id, id))
    .limit(1)
    .then(res => res[0]);

  if (!foundModule) {
    return c.json({ error: "Module not found" }, HTTP_STATUS_CODES.NOT_FOUND);
  }

  return c.json(foundModule);
}; 