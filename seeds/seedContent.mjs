// Loads the versioned game content (src/content) into PostgreSQL. Idempotent.
import { loadContent } from "../src/content/index.js";
import { MANDATE_COMPLETED_ENDING_CODE } from "../src/domain/constants.js";
import { upsertCards } from "../src/repositories/cardRepository.js";
import { upsertEndings } from "../src/repositories/endingRepository.js";

export async function seedContent(client) {
  const { cards, endings, warnings } = loadContent();

  await client.query("BEGIN");
  try {
    await upsertEndings(
      client,
      Object.entries(endings).map(([code, ending]) => ({
        code,
        kind: code === MANDATE_COMPLETED_ENDING_CODE ? "completion" : "collapse",
        title: ending.title,
        text: ending.text,
      })),
    );
    await upsertCards(client, cards);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }

  return { cards: cards.length, endings: Object.keys(endings).length, warnings };
}
