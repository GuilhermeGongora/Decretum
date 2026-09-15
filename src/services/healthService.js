import { pingDatabase } from "@/src/repositories/healthRepository";
import { logger } from "@/src/utils/logger";

export async function checkHealth({ ping = pingDatabase, log = logger } = {}) {
  try {
    await ping();
    return { healthy: true, report: { status: "ok", database: "ok" } };
  } catch (error) {
    log.error("health.database_unavailable", { error });
    return { healthy: false, report: { status: "error", database: "unavailable" } };
  }
}
