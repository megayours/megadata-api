import { sql } from "bun";

export async function accountExists(accountId: string): Promise<boolean> {
  const [account] = await sql`
    SELECT 1 FROM account 
    WHERE id = ${accountId}
  `;

  console.log("account", account);
  return !!account;
}

export async function handleDatabaseError(error: any): Promise<never> {
  if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
    throw new Error("Account does not exist");
  }
  throw error;
}