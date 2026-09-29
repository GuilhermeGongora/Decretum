import {
  errorResponse,
  jsonResponse,
  parseDecisionPayload,
  readJsonBody,
} from "@/src/http/responses";
import { limitWrites } from "@/src/http/rateLimit";
import { decide } from "@/src/services/gameService";

export async function POST(request, { params }) {
  try {
    await limitWrites(request, "decisions");
    const { id } = await params;
    const payload = parseDecisionPayload(await readJsonBody(request));
    return jsonResponse(await decide(id, payload));
  } catch (error) {
    return errorResponse(error);
  }
}
