import { AppError, DomainRuleError, ValidationError } from "@/src/errors";
import { CHOICE_SIDES } from "@/src/domain/constants";
import { logger } from "@/src/utils/logger";

export function jsonResponse(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Client errors expose their code; anything else is logged and returned without internals.
export function errorResponse(error) {
  if (error instanceof AppError && error.statusCode < 500) {
    return jsonResponse({ error: { code: error.code, message: error.message } }, error.statusCode);
  }

  logger.error("http.unexpected_error", { error });
  const status = error instanceof AppError && error.statusCode === 503 ? 503 : 500;
  return jsonResponse(
    {
      error: {
        code: status === 503 ? "SERVICE_UNAVAILABLE" : "INTERNAL_ERROR",
        message: "Unexpected error",
      },
    },
    status,
  );
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON", { code: "INVALID_JSON" });
  }
}

const DECISION_FIELDS = ["choice", "turn"];

// GDD §12.1: only the chosen side is accepted; `turn` is a concurrency guard, not an effect.
export function parseDecisionPayload(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const unknownFields = Object.keys(body).filter((key) => !DECISION_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    throw new ValidationError(`Unknown fields: ${unknownFields.join(", ")}`, {
      code: "UNKNOWN_FIELDS",
    });
  }

  if (typeof body.choice !== "string") {
    throw new ValidationError("choice is required and must be a string");
  }
  if (!CHOICE_SIDES.includes(body.choice)) {
    throw new DomainRuleError("choice must be left or right", { code: "INVALID_CHOICE" });
  }
  if (body.turn !== undefined && !(Number.isInteger(body.turn) && body.turn >= 1)) {
    throw new ValidationError("turn must be a positive integer");
  }

  return { choice: body.choice, expectedTurn: body.turn };
}
