import { AppError, DomainRuleError, ValidationError } from "@/src/errors";
import { CABINET_ACTIONS, CHOICE_SIDES } from "@/src/domain/constants";
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

// Creating a government has no required field, so a request with no body at all is still valid.
export async function readOptionalJsonBody(request) {
  const raw = await request.text();
  if (raw.trim() === "") return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new ValidationError("Request body must be valid JSON", { code: "INVALID_JSON" });
  }
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

const CABINET_ACTION_FIELDS = ["turn", "action", "ministryKey", "candidateId"];

/**
 * The client sends an intention and nothing else: which operation, which ministry, which candidate.
 *
 * What a change costs — pillars, loyalty, who is the most exposed minister — belongs to the server,
 * so a body carrying effects, loyalty, competence, influence, an occupant, flags or a country is
 * refused outright rather than quietly ignored. `turn` is a concurrency guard, never an effect.
 */
export function parseCabinetActionPayload(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object");
  }

  const unknownFields = Object.keys(body).filter((key) => !CABINET_ACTION_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    throw new ValidationError(`Unknown fields: ${unknownFields.join(", ")}`, {
      code: "UNKNOWN_FIELDS",
    });
  }

  if (typeof body.action !== "string") {
    throw new ValidationError("action is required and must be a string");
  }
  if (!CABINET_ACTIONS.includes(body.action)) {
    throw new DomainRuleError(`action must be one of: ${CABINET_ACTIONS.join(", ")}`, {
      code: "UNKNOWN_CABINET_ACTION",
    });
  }
  if (typeof body.ministryKey !== "string" || body.ministryKey.trim() === "") {
    throw new ValidationError("ministryKey is required and must be a string");
  }

  // Dismissing names no successor, and appointing without one would be a change that changes nothing.
  const needsCandidate = body.action !== "dismiss";
  if (needsCandidate && (typeof body.candidateId !== "string" || body.candidateId.trim() === "")) {
    throw new ValidationError(`${body.action} requires a candidateId`);
  }
  if (!needsCandidate && body.candidateId !== undefined) {
    throw new ValidationError("dismiss does not take a candidateId");
  }
  if (body.turn !== undefined && !(Number.isInteger(body.turn) && body.turn >= 1)) {
    throw new ValidationError("turn must be a positive integer");
  }

  return {
    turn: body.turn,
    action: body.action,
    ministryKey: body.ministryKey,
    candidateId: needsCandidate ? body.candidateId : undefined,
  };
}

const GAME_FIELDS = ["countryCode", "candidate", "campaign"];
const CANDIDATE_FIELDS = ["name", "treatment", "origin", "style", "party", "coalition", "promise"];
const CANDIDATE_NAME_MAX = 60;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

function assertObject(value, message) {
  if (!isPlainJsonObject(value)) throw new ValidationError(message);
}

function isPlainJsonObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// The client sends who it wants to be and which side it took in each campaign decision. Everything
// the campaign causes — votes, pillars, flags — is resolved by the server.
export function parseGameCreationPayload(body) {
  assertObject(body, "Request body must be a JSON object");

  const unknownFields = Object.keys(body).filter((key) => !GAME_FIELDS.includes(key));
  if (unknownFields.length > 0) {
    throw new ValidationError(`Unknown fields: ${unknownFields.join(", ")}`, {
      code: "UNKNOWN_FIELDS",
    });
  }

  if (body.countryCode !== undefined && !COUNTRY_CODE_PATTERN.test(String(body.countryCode))) {
    throw new ValidationError("countryCode must be two uppercase letters");
  }
  const countryCode = body.countryCode;

  // A government can still be opened without a prologue; it then starts with balanced pillars.
  if (body.candidate === undefined && body.campaign === undefined) {
    return { countryCode, candidate: null, campaignChoices: null };
  }
  if (body.candidate === undefined || body.campaign === undefined) {
    throw new ValidationError("candidate and campaign must be sent together");
  }

  assertObject(body.candidate, "candidate must be an object");
  const unknownCandidateFields = Object.keys(body.candidate).filter(
    (key) => !CANDIDATE_FIELDS.includes(key),
  );
  if (unknownCandidateFields.length > 0) {
    throw new ValidationError(`Unknown candidate fields: ${unknownCandidateFields.join(", ")}`, {
      code: "UNKNOWN_FIELDS",
    });
  }
  for (const field of CANDIDATE_FIELDS) {
    if (typeof body.candidate[field] !== "string" || body.candidate[field].trim() === "") {
      throw new ValidationError(`candidate ${field} is required`);
    }
  }
  const name = body.candidate.name.trim();
  if (name.length > CANDIDATE_NAME_MAX) {
    throw new ValidationError(`candidate name must be at most ${CANDIDATE_NAME_MAX} characters`);
  }

  assertObject(body.campaign, "campaign must be an object");
  const unknownCampaignFields = Object.keys(body.campaign).filter((key) => key !== "choices");
  if (unknownCampaignFields.length > 0) {
    throw new ValidationError(`Unknown campaign fields: ${unknownCampaignFields.join(", ")}`, {
      code: "UNKNOWN_FIELDS",
    });
  }
  // Shape only: which sides exist is the engine's rule, enforced in src/domain/election.js.
  if (!Array.isArray(body.campaign.choices)) {
    throw new ValidationError("campaign choices must be an array");
  }

  return {
    countryCode,
    candidate: { ...body.candidate, name },
    campaignChoices: body.campaign.choices,
  };
}
