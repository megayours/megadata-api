import { db } from "../db";
import { module, collectionModule } from "../db/schema";
import { eq } from "drizzle-orm";
import { ResultAsync, err } from "neverthrow";
import { ApiError, DatabaseError, ValidationError } from "../utils/errors";
import { validateDataAgainstSchema } from "../utils/schema";

export const getModules = () => {
  return ResultAsync.fromPromise(
    db.select().from(module),
    (error) => new DatabaseError("Failed to fetch modules", error as ApiError)
  );
};

export const getModuleById = (id: string) => {
  return ResultAsync.fromPromise(
    db.select().from(module).where(eq(module.id, id)),
    (error) => new DatabaseError("Failed to fetch module", error as ApiError)
  );
};

export const getCollectionModules = (collectionId: number) => {
  return ResultAsync.fromPromise(
    db
      .select()
      .from(collectionModule)
      .innerJoin(module, eq(collectionModule.module_id, module.id))
      .where(eq(collectionModule.collection_id, collectionId)),
    (error) => new DatabaseError("Failed to fetch collection modules", error as ApiError)
  );
};

export const validateTokenData = (data: unknown, moduleId: string) => {
  return ResultAsync.fromPromise(
    db.select().from(module).where(eq(module.id, moduleId)),
    (error) => new DatabaseError("Failed to fetch module", error as ApiError)
  ).andThen((modules) => {
    if (modules.length === 0) {
      return ResultAsync.fromPromise(
        Promise.resolve(err(new DatabaseError("Module not found"))),
        (error) => new DatabaseError("Failed to validate data", error as ApiError)
      );
    }
    const moduleSchema = modules[0]?.schema;
    if (!moduleSchema) {
      return ResultAsync.fromPromise(
        Promise.resolve(err(new DatabaseError("Module schema not found"))),
        (error) => new ValidationError("Failed to validate data", error as ApiError)
      );
    }
    return validateDataAgainstSchema(data, moduleSchema).map(() => true);
  });
}; 