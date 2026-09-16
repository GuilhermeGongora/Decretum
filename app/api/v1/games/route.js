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
    return jsonResponse(await createGame(payload), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
