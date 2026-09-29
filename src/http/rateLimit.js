import { enforceLimit } from "@/src/services/rateLimitService";

/**
 * Who is asking, as far as an application behind a proxy can tell.
 *
 * The socket address belongs to the proxy, so the client is the first hop of the forwarded chain.
 * Requests that arrive with no forwarding header at all share one bucket: clients we cannot tell
 * apart being limited together is better than none of them being limited.
 */
export function clientOf(request) {
  const chain = request.headers.get("x-forwarded-for");
  const first = chain?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function limitWrites(request, action) {
  return enforceLimit(action, clientOf(request));
}
