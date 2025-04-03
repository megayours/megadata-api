import { sql } from "bun";
import { randomUUID } from "crypto";
import { runMigrations } from "../db/migrate";

export const generateRandomAccount = () => ({
  id: randomUUID(),
  type: `test_type_${randomUUID().slice(0, 8)}`,
});



export const setupTestDatabase = async () => {
  const postgresUrl = process.env.POSTGRES_URL;
  if (!postgresUrl) {
    throw new Error("POSTGRES_URL is not set");
  }
  try {
    // Verify database connection
    await sql`SELECT 1`;
    console.log("✅ Database connection verified");

    // Run migrations
    await runMigrations();
    console.log("✅ Migrations run");
  } catch (error) {
    console.error("Error setting up test database:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw error;
  }
};