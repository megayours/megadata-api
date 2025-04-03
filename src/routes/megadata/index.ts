import { Elysia, t } from "elysia";
import { sql } from "bun";
import { handleDatabaseError } from "../../db/helpers";
import { MegadataTokenRequest, MegadataTokenResponse, MegadataCollectionResponse, CreateMegadataCollectionRequest } from "./types";

export const megadataRoutes = new Elysia()
  .get("/megadata/collections", async ({ set }) => {
    try {
      const collections = await sql`SELECT * FROM megadata_collection`;
      return collections;
    } catch (error) {
      set.status = 500;
      throw handleDatabaseError(error);
    }
  }, {
    response: t.Array(MegadataCollectionResponse)
  })
  .post("/megadata/collections", async ({ body, set }) => {
    const { name, account_id } = body;

    if (name === undefined) {
      set.status = 400;
      return { error: "No name provided" };
    }

    if (account_id === undefined) {
      set.status = 400;
      return { error: "No account_id provided" };
    }

    console.log(`Creating collection ${name} for account ${account_id}`);

    try {
      const [account] = await sql`SELECT * FROM account WHERE id = ${account_id}`;
      if (!account) {
        set.status = 404;
        return { error: "Account not found" };
      }
      const [collection] = await sql`
        INSERT INTO megadata_collection (name, account_id)
        VALUES (${name}, ${account_id})
        RETURNING id, name, account_id, is_published, created_at, updated_at
      `;
      console.log(`Collection created: ${collection}`);
      return collection;
    } catch (error) {
      console.error(`Error creating collection: ${error}`);
      throw handleDatabaseError(error);
    }
  }, {
    body: CreateMegadataCollectionRequest,
    response: MegadataCollectionResponse
  })
  .put("/megadata/collections/:id/publish", async ({ params: { id } }) => {
    try {
      await sql`UPDATE megadata_collection SET is_published = true WHERE id = ${id}`;
      return { success: true };
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }, {
    response: t.Object({ success: t.Boolean() })
  })
  .get("/megadata/collections/:id", async ({ params: { id }, set }) => {
    try {
      const [collection] = await sql`SELECT * FROM megadata_collection WHERE id = ${id}`;
      if (!collection) {
        set.status = 404;
        return { error: "Collection not found" };
      }
      return collection;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }, {
    response: MegadataCollectionResponse
  })
  .get("/megadata/collections/:id/tokens", async ({ params: { id }, set }) => {
    try {
      const tokens = await sql`SELECT * FROM megadata_token WHERE collection_id = ${id}`;
      if (!tokens) {
        set.status = 404;
        return { error: "Tokens not found" };
      }
      return tokens;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }, {
    response: t.Array(MegadataTokenResponse)
  })
  .put("/megadata/collections/:id/tokens/:token_id/publish", async ({ params: { id, token_id }, set }) => {
    try {
      const [token] = await sql`
        UPDATE megadata_token 
        SET is_published = true 
        WHERE id = ${token_id} AND collection_id = ${id}
        RETURNING *`;
      if (!token) {
        set.status = 404;
        return { error: "Token not found" };
      }
      return token;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }, {
    response: t.Object({ success: t.Boolean() })
  })
  .post("/megadata/collections/:id/tokens", async ({ params: { id }, body, set }) => {
    const { data } = body;
    console.log(`Creating token for collection ${id} with data ${data}`);
    try {
      const [collection] = await sql`SELECT * FROM megadata_collection WHERE id = ${id}`;
      if (!collection) {
        set.status = 404;
        return { error: "Collection not found" };
      }

      const [token] = await sql`
        INSERT INTO megadata_token (collection_id, data)
        VALUES (${id}, ${data})
        RETURNING id, collection_id, data, is_published, created_at, updated_at
      `;
      set.status = 201;
      return token;
    } catch (error) {
      console.error(`Error creating token: ${error}`);
      throw handleDatabaseError(error);
    }
  },
    {
      body: MegadataTokenRequest,
      response: MegadataTokenResponse
    })
  .get("/megadata/collections/:id/tokens/:token_id", async ({ params: { id, token_id }, set }) => {
    try {
      const [token] = await sql`SELECT * FROM megadata_token WHERE id = ${token_id} AND collection_id = ${id}`;
      if (!token) {
        set.status = 404;
        return { error: "Token not found" };
      }
      return token;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }, {
    response: MegadataTokenResponse
  })
  .put("/megadata/collections/:id", async ({ params: { id }, body, set }) => {
    const { name } = body;

    if (name === undefined) {
      set.status = 400;
      return { error: "No name provided" };
    }

    try {
      const [collection] = await sql`
        UPDATE megadata_collection
        SET  
          name = ${name},
          updated_at = ${new Date().toISOString()}
        WHERE id = ${id}
        RETURNING *
      `;
      if (!collection) {
        set.status = 404;
        return { error: "Collection not found" };
      }
      return collection;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }, {
    body: CreateMegadataCollectionRequest,
    response: MegadataCollectionResponse
  })
  .put("/megadata/collections/:id/tokens/:token_id", async ({ params: { id, token_id }, body, set }) => {
    const { data } = body;
    console.log(`Updating token ${token_id} for collection ${id} with data ${data}`);
    if (data === undefined) {
      set.status = 400;
      return { error: "No data provided" };
    }

    try {
      const [token] = await sql`
        UPDATE megadata_token
        SET  
          data = ${data},
          updated_at = ${new Date().toISOString()}
        WHERE id = ${token_id} AND collection_id = ${id}
        RETURNING *
      `;
      if (!token) {
        set.status = 404;
        return { error: "Token not found" };
      }
      return token;
    } catch (error) {
      console.error(`Error updating token: ${error}`);
      throw handleDatabaseError(error);
    }
  }, {
    body: MegadataTokenRequest,
    response: MegadataTokenResponse
  })
  .delete("/megadata/collections/:id", async ({ params: { id }, set }) => {
    try {
      const [collection] = await sql`DELETE FROM megadata_collection WHERE id = ${id} RETURNING *`;
      if (!collection) {
        set.status = 404;
        return { error: "Collection not found" };
      }

      return collection;
    } catch (error) {
      console.error(`Error deleting collection: ${error}`);
      throw handleDatabaseError(error);
    }
  }, {
    response: MegadataCollectionResponse
  })
  .delete("/megadata/collections/:id/tokens/:token_id", async ({ params: { id, token_id }, set }) => {
    try {
      const [token] = await sql`DELETE FROM megadata_token WHERE id = ${token_id} RETURNING *`;
      if (!token) {
        set.status = 404;
        return { error: "Token not found" };
      }

      return token;
    } catch (error) {
      console.error(`Error deleting token: ${error}`);
      throw handleDatabaseError(error);
    }
  }, {
    response: MegadataTokenResponse
  });
