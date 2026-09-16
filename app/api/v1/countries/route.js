import { errorResponse, jsonResponse } from "@/src/http/responses";
import { listCountryDossiers } from "@/src/services/countryService";

export async function GET() {
  try {
    return jsonResponse(listCountryDossiers());
  } catch (error) {
    return errorResponse(error);
  }
}
