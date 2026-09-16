import { runner } from "node-pg-migrate";
import pg from "pg";
import { seedContent } from "../../../seeds/seedContent.mjs";

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for integration tests (see .env.test).");
  }

  await runner({
    databaseUrl,
    dir: "migrations",
    direction: "up",
    migrationsTable: "pgmigrations",
    count: Infinity,
    log: () => {},
  });

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await seedContent(client);
  } finally {
    await client.end();
  }
}
