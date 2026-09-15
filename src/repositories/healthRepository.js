import { query } from "@/src/database/pool";

export async function pingDatabase() {
  await query("SELECT 1");
}
