import { checkHealth } from "@/src/services/healthService";

// A health check must reflect the live database state, never a build-time snapshot.
export const dynamic = "force-dynamic";

export async function GET() {
  const { healthy, report } = await checkHealth();

  return Response.json(report, {
    status: healthy ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
