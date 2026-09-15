import { createLogger } from "@/src/utils/logger";

function createCapturingLogger(level) {
  const lines = [];
  const logger = createLogger({
    level,
    write: (entryLevel, line) => lines.push({ entryLevel, entry: JSON.parse(line) }),
    now: () => new Date("2026-01-01T00:00:00.000Z"),
  });
  return { logger, lines };
}

describe("createLogger", () => {
  it("writes one structured JSON entry with timestamp, level, message and context", () => {
    const { logger, lines } = createCapturingLogger("info");

    logger.info("server.started", { port: 3000 });

    expect(lines).toEqual([
      {
        entryLevel: "info",
        entry: {
          timestamp: "2026-01-01T00:00:00.000Z",
          level: "info",
          message: "server.started",
          port: 3000,
        },
      },
    ]);
  });

  it("drops entries below the configured level", () => {
    const { logger, lines } = createCapturingLogger("warn");

    logger.debug("ignored");
    logger.info("ignored");
    logger.warn("kept");

    expect(lines.map(({ entry }) => entry.message)).toEqual(["kept"]);
  });

  it("writes nothing when silent", () => {
    const { logger, lines } = createCapturingLogger("silent");

    logger.error("ignored");

    expect(lines).toEqual([]);
  });

  describe("given an Error in the context", () => {
    it("keeps name, code and message but omits the stack", () => {
      const { logger, lines } = createCapturingLogger("error");
      const error = Object.assign(new Error("boom"), { code: "E_BOOM" });

      logger.error("operation.failed", { error });

      expect(lines[0].entry.error).toEqual({ name: "Error", code: "E_BOOM", message: "boom" });
    });
  });
});
