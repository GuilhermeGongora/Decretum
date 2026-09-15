import { closePool } from "@/src/database/pool";

// Port 1 on loopback refuses connections immediately, so this fails fast and deterministically.
const UNREACHABLE_DATABASE_URL = "postgres://nobody:not-a-real-secret@127.0.0.1:1/nowhere";

describe("GET /api/v1/health", () => {
  describe("when PostgreSQL is unreachable", () => {
    let GET;

    beforeAll(async () => {
      process.env.DATABASE_URL = UNREACHABLE_DATABASE_URL;
      ({ GET } = await import("@/app/api/v1/health/route"));
    });

    afterAll(async () => {
      await closePool();
    });

    it("responds 503 and reports the database as unavailable", async () => {
      const response = await GET();

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: "error", database: "unavailable" });
    });

    it("does not expose the connection string or error internals", async () => {
      const response = await GET();
      const body = await response.text();

      expect(body).not.toMatch(/not-a-real-secret|127\.0\.0\.1|ECONNREFUSED|stack/i);
    });
  });
});
