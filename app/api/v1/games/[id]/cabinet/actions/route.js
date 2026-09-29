import {
  errorResponse,
  jsonResponse,
  parseCabinetActionPayload,
  readJsonBody,
} from "@/src/http/responses";
import { limitWrites } from "@/src/http/rateLimit";
import { performCabinetAction } from "@/src/services/gameService";

export async function POST(request, { params }) {
  try {
    await limitWrites(request, "cabinet");
    const { id } = await params;
    const payload = parseCabinetActionPayload(await readJsonBody(request));
    return jsonResponse(await performCabinetAction(id, payload));
  } catch (error) {
    return errorResponse(error);
  }
}
