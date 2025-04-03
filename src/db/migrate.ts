import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { sql } from "bun";

async function runMigrations() {
  const migrationsDir = join(import.meta.dir, "migrations");
  const files = await readdir(migrationsDir);
  const sqlFiles = files
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of sqlFiles) {
    console.log(`🦋 Running migration: ${file}`);
    const filePath = join(migrationsDir, file);
    await sql.file(filePath);
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations()
    .then(() => {
      console.log("✅ Database migration completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

export { runMigrations }; 