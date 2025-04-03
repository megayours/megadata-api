import { Elysia, t } from "elysia";
import { sql } from "bun";
import { handleDatabaseError } from "../../db/helpers";
import { AccountResponse, CreateAccountRequest } from "./types";

export const accountRoutes = new Elysia()
  .get("/accounts", async ({ set }) => {
    try {
      const accounts: any[] = await sql`SELECT * FROM account ORDER BY created_at DESC`;
      return accounts;
    } catch (error) {
      set.status = 500;
      throw handleDatabaseError(error);
    }
  }, {
    response: t.Array(AccountResponse),
  })
  .get("/accounts/:id", async ({ params: { id }, set }) => {
    try {
      console.log("Received get account request:", id);
      const [account] = await sql`SELECT * FROM account WHERE id = ${id}`;
      if (!account) {
        set.status = 404;
        return { error: "Account not found" };
      }
      console.log("Account found:", account);
      return account;
    } catch (error) {
      set.status = 500;
      throw handleDatabaseError(error);
    }
  }, {
    response: AccountResponse
  })
  .post("/accounts", async ({ body, set }) => {
    console.log("Received create account request:", body);
    const { id, type } = body;

    try {
      const [account] = await sql`
        INSERT INTO account (id, type)
        VALUES (${id}, ${type})
        RETURNING *
      `;
      set.status = 201;
      return account;
    } catch (error) {
      console.error("Error creating account:", error);
      set.status = 500;
      throw handleDatabaseError(error);
    }
  }, {
    body: CreateAccountRequest,
    response: AccountResponse
  })
  .delete("/accounts/:id", async ({ params: { id }, set }) => {
    try {
      const [account] = await sql`
        DELETE FROM account 
        WHERE id = ${id}
        RETURNING *
      `;
      if (!account) {
        set.status = 404;
        return { error: "Account not found" };
      }
      return { success: true };
    } catch (error) {
      set.status = 500;
      throw handleDatabaseError(error);
    }
  }); 