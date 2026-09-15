import { GET } from "@/app/api/v1/health/route";
import { closePool } from "@/src/database/pool";

// Requires a reachable PostgreSQL at DATABASE_URL (see README: `npm run db:up`).
describe("GET /api/v1/health", () => {
  afterAll(async () => {
    await closePool();
  });

  describe("when PostgreSQL is reachable", () => {
    it("responds 200 with application and database ok", async () => {
      const response = await GET();

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ status: "ok", database: "ok" });
    });
  });
});
