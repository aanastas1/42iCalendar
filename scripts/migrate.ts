import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { neon } from "@neondatabase/serverless";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) {
    loadEnvFile(file);
    break;
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("Add DATABASE_URL to .env.local first");
  const migration = readFileSync("db/migrations/001_personal_feeds.sql", "utf8");
  const database = neon(databaseUrl);
  for (const statement of migration.split(";").map((value) => value.trim()).filter(Boolean)) {
    await database.query(statement);
  }
  console.log("Personal feeds migration applied.");
}

main().catch((error: unknown) => {
  console.error(`Error: ${error instanceof Error ? error.message : "Migration failed"}`);
  process.exitCode = 1;
});
