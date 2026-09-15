import { checkHealth } from "@/src/services/healthService";

function createSpyLogger() {
  const entries = [];
  return {
    entries,
    error: (message, context) => entries.push({ message, context }),
  };
}

describe("checkHealth", () => {
  describe("when the database responds", () => {
    it("reports the application and the database as ok", async () => {
      const result = await checkHealth({ ping: async () => {}, log: createSpyLogger() });

      expect(result).toEqual({ healthy: true, report: { status: "ok", database: "ok" } });
    });
  });

  describe("when the database is unreachable", () => {
    const failingPing = async () => {
      throw new Error("connect ECONNREFUSED postgres://user:secret@db:5432/app");
    };

    it("reports the database as unavailable", async () => {
      const result = await checkHealth({ ping: failingPing, log: createSpyLogger() });

      expect(result).toEqual({
        healthy: false,
        report: { status: "error", database: "unavailable" },
      });
    });

    it("does not leak error details into the report", async () => {
      const { report } = await checkHealth({ ping: failingPing, log: createSpyLogger() });

      expect(JSON.stringify(report)).not.toMatch(/secret|ECONNREFUSED|postgres:\/\//);
    });

    it("logs the failure for operators", async () => {
      const log = createSpyLogger();

      await checkHealth({ ping: failingPing, log });

      expect(log.entries).toHaveLength(1);
      expect(log.entries[0].message).toBe("health.database_unavailable");
    });
  });
});
