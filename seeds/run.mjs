import pg from "pg";
import { seedContent } from "./seedContent.mjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  const { cards, endings, warnings } = await seedContent(client);
  console.log(`Seeded ${cards} cards and ${endings} endings.`);
  if (warnings.length > 0) {
    console.log(`\nEditorial guideline warnings (${warnings.length}, not errors):`);
    for (const warning of warnings) console.log(`- ${warning}`);
  }
} catch (error) {
  console.error(`Seeding failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
