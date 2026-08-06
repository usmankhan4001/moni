import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, isDatabaseConfigured } from "./index";

export async function runMigrations() {
  if (!isDatabaseConfigured() || !db) {
    console.log("Database not configured. Skipping migrations.");
    return;
  }
  try {
    console.log("Running Drizzle database migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Drizzle migrations completed successfully.");
  } catch (error) {
    console.error("Migration error:", error);
  }
}
