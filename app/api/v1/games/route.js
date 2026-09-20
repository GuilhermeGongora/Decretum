import {
  errorResponse,
  jsonResponse,
  parseGameCreationPayload,
  readOptionalJsonBody,
} from "@/src/http/responses";
import { createGame } from "@/src/services/gameService";

export async function POST(request) {
  try {
    const payload = parseGameCreationPayload(await readOptionalJsonBody(request));
    const result = await createGame(payload);
    // A defeated campaign created nothing, so it is not a 201: the count is the whole answer.
    return jsonResponse(result, result.game ? 201 : 200);
  } catch (error) {
    return errorResponse(error);
  }
}
