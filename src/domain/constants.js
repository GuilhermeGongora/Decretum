export const PRESIDENT_ROLE = "president";

export const METERS = Object.freeze(["people", "market", "congress", "institutions"]);
export const METER_MIN = 0;
export const METER_MAX = 100;
export const METER_CENTER = 50;
export const INITIAL_METER_VALUE = 50;

export const MANDATE_TURNS = 48;
export const MONTHS_PER_YEAR = 12;

export const SUCCESSOR_METER_BOUNDS = Object.freeze({ min: 40, max: 60 });
export const MAX_INHERITED_FLAGS = 5;

export const GAME_STATUS = Object.freeze({
  ACTIVE: "active",
  ENDED: "ended",
  COMPLETED: "completed",
});

export const EVENT_STATUS = Object.freeze({
  PENDING: "pending",
  FIRED: "fired",
  CANCELLED: "cancelled",
});

export const CHOICE_SIDES = Object.freeze(["left", "right"]);

// Milestone cards (GDD §10.5) have no content in the MVP; see docs/game-rules.md.
export const CARD_TYPES = Object.freeze(["common", "conditional", "chained", "crisis"]);

export const CARD_CATEGORIES = Object.freeze([
  "economy",
  "budget",
  "health",
  "education",
  "infrastructure",
  "security",
  "labor",
  "environment",
  "foreign_affairs",
  "federalism",
  "justice",
  "media",
  "civil_rights",
  "scandal",
  "congress",
]);

// Fixed precedence for ties between endings and between pillar averages (GDD §12.3).
export const ENDING_PRECEDENCE = Object.freeze(["institutions", "people", "congress", "market"]);

export const COLLAPSE_ENDING_CODES = Object.freeze({
  people: Object.freeze({ low: "people_abandoned", high: "people_dominant" }),
  market: Object.freeze({ low: "market_collapsed", high: "market_dominant" }),
  congress: Object.freeze({ low: "congress_isolated", high: "congress_dominant" }),
  institutions: Object.freeze({ low: "institutions_broken", high: "institutions_dominant" }),
});

export const MANDATE_COMPLETED_ENDING_CODE = "mandate_completed";

// A government removed by a constitutional procedure. It is seeded as a collapse ending: the
// government fell, and the endings table only distinguishes collapse from completion.
export const REMOVED_ENDING_CODE = "removed_from_office";

export const ENDING_CODES = Object.freeze([
  ...Object.values(COLLAPSE_ENDING_CODES).flatMap(({ low, high }) => [low, high]),
  MANDATE_COMPLETED_ENDING_CODE,
  REMOVED_ENDING_CODE,
]);

// Constitutional procedures (playbook §5). The country pack names the stages; the engine only knows
// that a procedure moves through an ordered chain and resolves once.
export const PROCEDURE_TYPES = Object.freeze(["impeachment"]);

export const PROCEDURE_STAGES = Object.freeze([
  "grounds_emerging",
  "petition_filed",
  "speaker_review",
  "chamber_campaign",
  "chamber_vote",
  "senate_admissibility",
  "suspended",
  "senate_trial",
]);

export const PROCEDURE_STATUS = Object.freeze({ ACTIVE: "active", RESOLVED: "resolved" });

export const PROCEDURE_RESOLUTIONS = Object.freeze(["archived", "acquitted", "removed", "expired"]);

export const EPITHET_CODES = Object.freeze([
  "equilibrist",
  "voice_of_the_streets",
  "economy_guarantor",
  "coalition_master",
  "charter_guardian",
  "survivor",
  "brief_government",
]);
