import { errorResponse, jsonResponse } from "@/src/http/responses";
import { createSuccessor } from "@/src/services/gameService";

export async function POST(_request, { params }) {
  try {
    const { id } = await params;
    return jsonResponse(await createSuccessor(id), 201);
  } catch (error) {
    return errorResponse(error);
  }
}
