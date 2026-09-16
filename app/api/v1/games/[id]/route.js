import { errorResponse, jsonResponse } from "@/src/http/responses";
import { getGame } from "@/src/services/gameService";

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    return jsonResponse(await getGame(id));
  } catch (error) {
    return errorResponse(error);
  }
}
