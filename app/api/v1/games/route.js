import { errorResponse, jsonResponse } from "@/src/http/responses";
import { createGame } from "@/src/services/gameService";

export async function POST() {
  try {
    return jsonResponse(await createGame(), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
