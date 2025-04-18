import { db } from "../db";
import { megadataToken, module, tokenModule } from "../db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ResultAsync } from "neverthrow";
import { ApiError, DatabaseError } from "../utils/errors";

export const getModules = (ids?: string[]) => {
  return ResultAsync.fromPromise(
    db.select().from(module).where(ids ? inArray(module.id, ids) : sql`1 = 1`),
    (error) => new DatabaseError("Failed to fetch modules", error as ApiError)
  );
};

export const getModuleById = (id: string) => {
  return ResultAsync.fromPromise(
    db.select().from(module).where(eq(module.id, id)),
    (error) => new DatabaseError("Failed to fetch module", error as ApiError)
  );
};

export const getTokenModules = (collectionId: number, tokenId: string) => {
  return ResultAsync.fromPromise(
    db
      .select()
      .from(tokenModule)
      .innerJoin(module, eq(tokenModule.module_id, module.id))
      .innerJoin(megadataToken, eq(tokenModule.token_row_id, megadataToken.row_id))
      .where(and(
        eq(megadataToken.collection_id, collectionId),
        eq(megadataToken.id, tokenId)
      )),
    (error) => new DatabaseError("Failed to fetch collection modules", error as ApiError)
  );
};
