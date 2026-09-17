import {
  errorResponse,
  jsonResponse,
  parseCabinetActionPayload,
  readJsonBody,
} from "@/src/http/responses";
import { performCabinetAction } from "@/src/services/gameService";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const payload = parseCabinetActionPayload(await readJsonBody(request));
    return jsonResponse(await performCabinetAction(id, payload));
  } catch (error) {
    return errorResponse(error);
  }
}
