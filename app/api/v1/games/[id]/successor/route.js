import { errorResponse, jsonResponse } from "@/src/http/responses";
import { limitWrites } from "@/src/http/rateLimit";
import { createSuccessor } from "@/src/services/gameService";

export async function POST(request, { params }) {
  try {
    await limitWrites(request, "games");
    const { id } = await params;
    return jsonResponse(await createSuccessor(id), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
