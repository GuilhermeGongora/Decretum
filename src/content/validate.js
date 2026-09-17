import {
  CARD_CATEGORIES,
  CARD_TYPES,
  CHOICE_SIDES,
  ENDING_CODES,
  EPITHET_CODES,
  MANDATE_TURNS,
  METER_MAX,
  METER_MIN,
  METERS,
  PRESIDENT_ROLE,
  PROCEDURE_STAGES,
  PROCEDURE_TYPES,
} from "../domain/constants.js";
import { EFFECT_OPERATIONS } from "../domain/effects.js";
import { DRIVERS as LEGISLATIVE_DRIVERS } from "../domain/legislature.js";

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

const CARD_FIELDS = [
  "slug",
  "version",
  "role",
  "type",
  "speaker",
  "category",
  "text",
  "leftChoice",
  "rightChoice",
  "conditions",
  "weight",
  "cooldownTurns",
  "uniquePerGame",
  "active",
  "tags",
];
const CHOICE_FIELDS = [
  "label",
  "effects",
  "conditionalEffects",
  "setFlags",
  "removeFlags",
  "schedule",
  "resultText",
  "headline",
  "reaction",
  "procedure",
];
// Pressure a choice puts on a running constitutional procedure. Content moves numbers and may ask for
// the next step; where that step lands is the engine's decision, never content's.
const PROCEDURE_EFFECT_FIELDS = [
  "evidence",
  "chamber",
  "senate",
  "coalitionCohesion",
  "publicPressure",
  "institutionalCredibility",
  "advance",
  "resolve",
];
const PROCEDURE_RESOLUTION_VALUES = ["archived", "acquitted", "removed", "expired"];
const CHARACTER_FIELDS = [
  "name",
  "role",
  "sphere",
  "initials",
  "portrait",
  "portraitPosition",
  "accent",
];
const CHARACTER_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PORTRAIT_PATTERN = /^\/assets\/characters\/[a-z0-9-]+\.(?:webp|png|jpg)$/;
const ACCENT_PATTERN = /^#[0-9a-f]{6}$/i;
const CONDITION_FIELDS = [
  "allFlags",
  "anyFlags",
  "noneFlags",
  "minTurn",
  "maxTurn",
  "meters",
  "anyMeters",
  "procedure",
];
const PROCEDURE_CONDITION_FIELDS = ["active", "type", "stages", "notStages"];
const FLAG_FIELDS = ["label", "legacy", "legacyPriority", "successorEffects"];

// Realm-independent: a plain object's prototype is a root prototype (its own prototype is null).
function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === null || Object.getPrototypeOf(prototype) === null;
}
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isIntegerAtLeast = (value, min) => Number.isInteger(value) && value >= min;

// Content is data: anything that is not JSON-like (functions, symbols, class instances) is rejected.
function findNonPlainData(value, path) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return null;
  if (typeof value === "number") return Number.isFinite(value) ? null : path;
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findNonPlainData(item, `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      const found = findNonPlainData(item, `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }
  return path;
}

function rejectUnknownFields(object, allowed, report) {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) report(`unknown field "${key}"`);
  }
}

function validateRange(range, label, report) {
  if (!isPlainObject(range)) return report(`${label} must be an object with min and max`);
  rejectUnknownFields(range, ["meter", "min", "max"], report);
  const { min = METER_MIN, max = METER_MAX } = range;
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < METER_MIN || max > METER_MAX) {
    report(`${label} limits must be integers between ${METER_MIN} and ${METER_MAX}`);
  } else if (min > max) {
    report(`${label} min cannot exceed max`);
  }
}

function validateConditions(conditions, { flags }, report) {
  if (conditions === undefined) return;
  if (!isPlainObject(conditions)) return report("conditions must be an object");

  for (const key of Object.keys(conditions)) {
    if (!CONDITION_FIELDS.includes(key)) report(`unknown condition "${key}"`);
  }

  if (conditions.procedure !== undefined) {
    const rule = conditions.procedure;
    if (!isPlainObject(rule)) {
      report("condition procedure must be an object");
    } else {
      rejectUnknownFields(rule, PROCEDURE_CONDITION_FIELDS, report);
      if (rule.active !== undefined && typeof rule.active !== "boolean") {
        report("condition procedure active must be a boolean");
      }
      if (rule.type !== undefined && !PROCEDURE_TYPES.includes(rule.type)) {
        report(`condition procedure has unknown type "${rule.type}"`);
      }
      for (const field of ["stages", "notStages"]) {
        const stages = rule[field];
        if (stages === undefined) continue;
        if (!Array.isArray(stages) || stages.length === 0) {
          report(`condition procedure ${field} must be a non-empty array`);
          continue;
        }
        for (const stage of stages) {
          if (!PROCEDURE_STAGES.includes(stage)) {
            report(`condition procedure ${field} has unknown stage "${stage}"`);
          }
        }
      }
    }
  }

  for (const field of ["allFlags", "anyFlags", "noneFlags"]) {
    const keys = conditions[field];
    if (keys === undefined) continue;
    if (!Array.isArray(keys)) {
      report(`${field} must be an array`);
      continue;
    }
    for (const key of keys) {
      if (!Object.hasOwn(flags, key)) report(`condition ${field} references unknown flag "${key}"`);
    }
  }

  const { minTurn = 1, maxTurn = MANDATE_TURNS } = conditions;
  if (
    !Number.isInteger(minTurn) ||
    !Number.isInteger(maxTurn) ||
    minTurn < 1 ||
    maxTurn > MANDATE_TURNS
  ) {
    report(`minTurn and maxTurn must be integers between 1 and ${MANDATE_TURNS}`);
  } else if (minTurn > maxTurn) {
    report("minTurn cannot exceed maxTurn");
  }

  if (conditions.meters !== undefined) {
    if (!isPlainObject(conditions.meters)) {
      report("condition meters must be an object");
    } else {
      for (const [meter, range] of Object.entries(conditions.meters)) {
        if (!METERS.includes(meter)) report(`condition meters has unknown pillar "${meter}"`);
        else validateRange(range, `condition range for ${meter}`, report);
      }
    }
  }

  if (conditions.anyMeters !== undefined) {
    if (!Array.isArray(conditions.anyMeters)) {
      report("condition anyMeters must be an array");
    } else {
      for (const range of conditions.anyMeters) {
        if (!METERS.includes(range?.meter))
          report(`condition anyMeters has unknown pillar "${range?.meter}"`);
        else validateRange(range, `condition anyMeters range for ${range.meter}`, report);
      }
    }
  }
}

function validateOperation(operation, choice, report) {
  if (!isPlainObject(operation)) return report("conditional effect must be an object");
  if (!EFFECT_OPERATIONS.includes(operation.type)) {
    return report(`unknown operation "${operation.type}"`);
  }
  if (!METERS.includes(operation.meter)) {
    return report(`operation has unknown pillar "${operation.meter}"`);
  }
  if (operation.type === "by_side") {
    rejectUnknownFields(operation, ["type", "meter", "below", "above"], report);
    if (!Number.isInteger(operation.below) || !Number.isInteger(operation.above)) {
      report("by_side operation needs integer below and above values");
    }
  } else {
    rejectUnknownFields(operation, ["type", "meter", "amount"], report);
    if (!isIntegerAtLeast(operation.amount, 1))
      report(`${operation.type} amount must be a positive integer`);
  }
  if ((choice.effects?.[operation.meter] ?? 0) !== 0) {
    report(`${operation.meter} cannot have both a fixed effect and an operation`);
  }
}

// A card may push the numbers of a running procedure and may ask it to take its next step, but it
// never names the stage that step reaches: the chain and the country's thresholds decide that.
function validateProcedure(procedure, side, report) {
  const at = (message) => report(`${side} procedure ${message}`);
  if (!isPlainObject(procedure)) return at("must be an object");

  rejectUnknownFields(procedure, PROCEDURE_EFFECT_FIELDS, at);

  for (const key of PROCEDURE_EFFECT_FIELDS) {
    if (key === "advance" || key === "resolve" || procedure[key] === undefined) continue;
    if (!Number.isInteger(procedure[key]) || Math.abs(procedure[key]) > 100) {
      at(`${key} must be an integer between -100 and 100`);
    }
  }

  if (procedure.advance !== undefined && procedure.advance !== true) {
    at("advance must be true when present");
  }
  if (procedure.resolve !== undefined && !PROCEDURE_RESOLUTION_VALUES.includes(procedure.resolve)) {
    at(`resolve must be one of: ${PROCEDURE_RESOLUTION_VALUES.join(", ")}`);
  }
  if (procedure.advance && procedure.resolve) {
    at("cannot advance and resolve in the same choice");
  }
  // "expired" is the one resolution the engine takes from any stage, because it belongs to the end of
  // the mandate and to the suspension deadline. Content reaching for it would skip the whole chain.
  if (procedure.resolve === "expired") {
    at("cannot expire a procedure; only the mandate or the suspension deadline does that");
  }
}

function validateChoice(choice, side, context, report, warn) {
  const at = (message) => report(`${side} ${message}`);
  if (!isPlainObject(choice)) return at("must be an object");

  rejectUnknownFields(choice, CHOICE_FIELDS, at);
  if (!isNonEmptyString(choice.label)) at("label must be a non-empty string");
  if (!isNonEmptyString(choice.resultText)) at("resultText must be a non-empty string");
  if (choice.procedure !== undefined) validateProcedure(choice.procedure, side, report);

  // Authored consequence of this side. Optional so older content still loads with the compact view.
  for (const field of ["headline", "reaction"]) {
    if (choice[field] === undefined)
      warn(`${side} has no ${field}; the compact consequence is shown`);
    else if (!isNonEmptyString(choice[field])) at(`${field} must be a non-empty string`);
  }

  if (!isPlainObject(choice.effects)) {
    at("effects must be an object");
  } else {
    for (const [meter, delta] of Object.entries(choice.effects)) {
      if (!METERS.includes(meter)) at(`effects has unknown pillar "${meter}"`);
      else if (!Number.isInteger(delta)) at(`effect on ${meter} must be an integer`);
    }
  }

  const operations = choice.conditionalEffects ?? [];
  if (!Array.isArray(operations)) at("conditionalEffects must be an array");
  else for (const operation of operations) validateOperation(operation, choice, at);

  const setFlags = choice.setFlags ?? [];
  if (!Array.isArray(setFlags)) {
    at("setFlags must be an array");
  } else {
    for (const entry of setFlags) {
      if (!isPlainObject(entry)) {
        at("setFlags entries must be objects");
        continue;
      }
      rejectUnknownFields(entry, ["key", "value", "expiresAfterTurns"], at);
      if (!Object.hasOwn(context.flags, entry.key)) at(`sets unknown flag "${entry.key}"`);
      if (
        entry.value !== undefined &&
        !["boolean", "string", "number"].includes(typeof entry.value)
      ) {
        at(`flag "${entry.key}" value must be a boolean, string or number`);
      }
      if (entry.expiresAfterTurns != null && !isIntegerAtLeast(entry.expiresAfterTurns, 1)) {
        at(`flag "${entry.key}" expiresAfterTurns must be an integer >= 1`);
      }
    }
  }

  const removeFlags = choice.removeFlags ?? [];
  if (!Array.isArray(removeFlags)) at("removeFlags must be an array");
  else
    for (const key of removeFlags)
      if (!Object.hasOwn(context.flags, key)) at(`removes unknown flag "${key}"`);

  const schedule = choice.schedule ?? [];
  if (!Array.isArray(schedule)) {
    at("schedule must be an array");
  } else {
    if (schedule.length > 1) at("can schedule at most one scheduled card");
    for (const entry of schedule) {
      if (!isPlainObject(entry)) {
        at("schedule entries must be objects");
        continue;
      }
      rejectUnknownFields(entry, ["cardSlug", "delayTurns", "priority"], at);
      if (!context.slugs.has(entry.cardSlug)) at(`schedules unknown card "${entry.cardSlug}"`);
      if (!isIntegerAtLeast(entry.delayTurns, 1)) at("delayTurns must be an integer >= 1");
      if (entry.priority !== undefined && !Number.isInteger(entry.priority))
        at("priority must be an integer");
    }
  }

  // Editorial guideline for common choices (GDD §8.7): warn, never block.
  if (context.cardType === "common" && isPlainObject(choice.effects)) {
    const fixed = Object.values(choice.effects).filter((delta) => delta !== 0);
    const pillars = fixed.length + (Array.isArray(operations) ? operations.length : 0);
    const magnitude = fixed.reduce((sum, delta) => sum + Math.abs(delta), 0);
    if (pillars < 2 || pillars > 3 || magnitude < 8 || magnitude > 18) {
      warn(
        `${side} touches ${pillars} pillars with total magnitude ${magnitude} (guideline: 2–3 pillars, 8–18)`,
      );
    }
  }
}

function validateCards(cards, context, errors, warnings) {
  if (!Array.isArray(cards)) {
    errors.push("cards must be an array");
    return;
  }

  const slugs = new Set(cards.map((card) => card?.slug));
  const seen = new Set();
  // A chained card is reachable when some choice schedules it, or when a country pack names it for a
  // stage the engine summons itself — the links no card can foresee, such as the result of a vote.
  const scheduled = new Set(
    Object.values(context.countries ?? {}).flatMap((country) =>
      Object.values(country?.removal?.cards ?? {}),
    ),
  );

  cards.forEach((card, index) => {
    const name = `card "${card?.slug ?? `#${index}`}"`;
    const report = (message) => errors.push(`${name}: ${message}`);
    const warn = (message) => warnings.push(`${name}: ${message}`);

    if (!isPlainObject(card)) return report("must be an object");
    rejectUnknownFields(card, CARD_FIELDS, report);

    if (typeof card.slug !== "string" || !KEY_PATTERN.test(card.slug))
      report("slug must be snake_case");
    else if (seen.has(card.slug)) report("duplicate slug");
    else seen.add(card.slug);

    if (card.version !== undefined && !isIntegerAtLeast(card.version, 1))
      report("version must be a positive integer");
    if (card.role !== undefined && card.role !== PRESIDENT_ROLE)
      report(`unknown role "${card.role}"`);
    if (!CARD_TYPES.includes(card.type)) report(`unknown type "${card.type}"`);
    if (!Object.hasOwn(context.characters, card.speaker))
      report(`unknown speaker "${card.speaker}"`);
    if (!CARD_CATEGORIES.includes(card.category)) report(`unknown category "${card.category}"`);
    if (!isNonEmptyString(card.text)) report("text must be a non-empty string");

    if (card.type === "chained") {
      if (!isIntegerAtLeast(card.weight, 0)) report("weight must be a non-negative integer");
    } else if (!isIntegerAtLeast(card.weight, 1)) {
      report("weight must be a positive integer");
    }
    if (!isIntegerAtLeast(card.cooldownTurns, 0))
      report("cooldownTurns must be a non-negative integer");

    for (const field of ["uniquePerGame", "active"]) {
      if (card[field] !== undefined && typeof card[field] !== "boolean")
        report(`${field} must be a boolean`);
    }
    if (
      card.tags !== undefined &&
      (!Array.isArray(card.tags) || !card.tags.every(isNonEmptyString))
    ) {
      report("tags must be an array of strings");
    }

    validateConditions(card.conditions, context, report);

    const choiceContext = { ...context, slugs, cardType: card.type };
    validateChoice(card.leftChoice, "leftChoice", choiceContext, report, warn);
    validateChoice(card.rightChoice, "rightChoice", choiceContext, report, warn);

    for (const side of [card.leftChoice, card.rightChoice]) {
      for (const entry of Array.isArray(side?.schedule) ? side.schedule : [])
        scheduled.add(entry?.cardSlug);
    }
  });

  for (const card of cards) {
    if (card?.type === "chained" && !scheduled.has(card.slug)) {
      warnings.push(`card "${card.slug}": chained card is never scheduled and cannot appear`);
    }
  }
}

function validateFlags(flags, errors) {
  if (!isPlainObject(flags)) {
    errors.push("flags must be an object");
    return;
  }
  for (const [key, definition] of Object.entries(flags)) {
    const report = (message) => errors.push(`flag "${key}": ${message}`);
    if (!KEY_PATTERN.test(key)) report("key must be snake_case");
    if (!isPlainObject(definition)) {
      report("must be an object");
      continue;
    }
    rejectUnknownFields(definition, FLAG_FIELDS, report);
    if (!isNonEmptyString(definition.label)) report("label must be a non-empty string");
    if (definition.legacy !== undefined && typeof definition.legacy !== "boolean")
      report("legacy must be a boolean");

    if (definition.legacy) {
      if (!Number.isInteger(definition.legacyPriority)) report("legacyPriority must be an integer");
      if (!isPlainObject(definition.successorEffects)) {
        report("successorEffects must be an object");
      } else {
        for (const [meter, delta] of Object.entries(definition.successorEffects)) {
          if (!METERS.includes(meter)) report(`successorEffects has unknown pillar "${meter}"`);
          else if (!Number.isInteger(delta))
            report(`successor effect on ${meter} must be an integer`);
        }
      }
    } else if (
      definition.successorEffects !== undefined ||
      definition.legacyPriority !== undefined
    ) {
      report("only legacy flags can declare legacyPriority or successorEffects");
    }
  }
}

function validateTextEntries(entries, requiredCodes, fields, kind, errors) {
  if (!isPlainObject(entries)) {
    errors.push(`${kind}s must be an object`);
    return;
  }
  for (const code of requiredCodes) {
    if (!Object.hasOwn(entries, code)) errors.push(`${kind} "${code}" is missing`);
  }
  for (const [code, entry] of Object.entries(entries)) {
    const report = (message) => errors.push(`${kind} "${code}": ${message}`);
    if (!requiredCodes.includes(code)) report(`unknown ${kind} code`);
    if (!isPlainObject(entry)) {
      report("must be an object");
      continue;
    }
    rejectUnknownFields(entry, fields, report);
    for (const field of fields) {
      if (!isNonEmptyString(entry[field])) report(`${field} must be a non-empty string`);
    }
  }
}

function validateCharacters(characters, errors) {
  if (!isPlainObject(characters)) {
    errors.push("characters must be an object");
    return;
  }
  // A display name belongs to one id only, so two records can never describe the same person.
  const idsByName = new Map();
  for (const [id, character] of Object.entries(characters)) {
    const report = (message) => errors.push(`character "${id}": ${message}`);
    if (!CHARACTER_ID_PATTERN.test(id)) report("id must be kebab-case");
    if (!isPlainObject(character)) {
      report("must be an object");
      continue;
    }
    rejectUnknownFields(character, CHARACTER_FIELDS, report);
    for (const field of ["name", "role", "initials"]) {
      if (!isNonEmptyString(character[field])) report(`${field} must be a non-empty string`);
    }
    if (!METERS.includes(character.sphere)) report(`sphere must be one of ${METERS.join(", ")}`);
    if (isNonEmptyString(character.name)) {
      const owner = idsByName.get(character.name);
      if (owner) report(`name "${character.name}" is already used by "${owner}"`);
      else idsByName.set(character.name, id);
    }
    if (character.portrait === undefined) {
      if (character.portraitPosition !== undefined) report("portraitPosition requires a portrait");
    } else {
      if (typeof character.portrait !== "string" || !PORTRAIT_PATTERN.test(character.portrait))
        report("portrait must be a file in /assets/characters/");
      if (!isNonEmptyString(character.portraitPosition))
        report("portrait needs a portraitPosition");
    }
    if (character.accent !== undefined && !ACCENT_PATTERN.test(String(character.accent)))
      report("accent must be a #rrggbb color");
  }
}

// Campaign options and candidate traits share this shape: a key, a label and optional consequences.
function validateCountryOption(option, label, context, report) {
  if (!isPlainObject(option)) return report(`${label} must be an object`);
  if (!isNonEmptyString(option.key ?? option.id)) report(`${label} needs a key`);
  if (!isNonEmptyString(option.label ?? option.name)) report(`${label} needs a label`);

  for (const [meter, delta] of Object.entries(option.meters ?? {})) {
    if (!METERS.includes(meter)) report(`${label} has unknown pillar "${meter}"`);
    else if (!Number.isInteger(delta)) report(`${label} effect on ${meter} must be an integer`);
  }
  for (const key of option.flags ?? []) {
    if (!Object.hasOwn(context.flags, key)) report(`${label} sets unknown flag "${key}"`);
  }
  for (const region of Object.keys(option.regions ?? {})) {
    if (!context.regions.includes(region)) report(`${label} has unknown region "${region}"`);
  }
}

function validateCountryCampaign(campaign, context, report) {
  if (!isPlainObject(campaign)) return report("campaign must be an object");

  if (!isIntegerAtLeast(campaign.electorate, 1))
    report("campaign electorate must be a positive integer");
  for (const field of ["baseShare", "baseTurnout"]) {
    if (!Number.isFinite(campaign[field])) report(`campaign ${field} must be a number`);
  }
  if (!(campaign.validVoteRate > 0 && campaign.validVoteRate <= 1)) {
    report("campaign validVoteRate must be between 0 and 1");
  }
  if (!isPlainObject(campaign.opponent) || !isNonEmptyString(campaign.opponent.name)) {
    report("campaign needs a named opponent");
  }

  if (!Array.isArray(campaign.questions) || campaign.questions.length === 0) {
    report("campaign needs questions");
  } else {
    const ids = new Set();
    for (const question of campaign.questions) {
      if (!isPlainObject(question)) {
        report("campaign question must be an object");
        continue;
      }
      if (!isNonEmptyString(question.id)) report("campaign question needs an id");
      else if (ids.has(question.id)) report(`duplicate campaign question "${question.id}"`);
      else ids.add(question.id);
      if (!isNonEmptyString(question.text)) report(`campaign question "${question.id}" needs text`);
      for (const side of CHOICE_SIDES) {
        validateCountryOption(
          question.options?.[side],
          `campaign question "${question.id}" ${side}`,
          context,
          report,
        );
      }
    }
  }

  // The resolver picks the first headline whose margin is reached, so one must always match.
  if (!Array.isArray(campaign.headlines) || campaign.headlines.length === 0) {
    report("campaign needs headlines");
  } else {
    for (const headline of campaign.headlines) {
      if (!isPlainObject(headline) || !isNonEmptyString(headline.text)) {
        report("campaign headline needs text");
      } else if (!Number.isFinite(headline.minMargin)) {
        report(`campaign headline "${headline.text.slice(0, 24)}…" needs a numeric minMargin`);
      }
    }
    if (!campaign.headlines.some((headline) => headline.minMargin <= 0)) {
      report("campaign headlines must cover a zero margin");
    }
  }
}

// A house that removes a president is a composition, not a dial: the blocs divide it exactly once,
// and every weight has to name a driver the engine knows. Shares that do not add up to one would
// silently shrink or inflate the parliament on every count.
function validateRemovalHouse(house, label, report) {
  if (!isPlainObject(house)) return report(`removal.${label} must be an object`);
  if (!isIntegerAtLeast(house.seats, 1)) {
    report(`removal.${label}.seats must be a positive integer`);
  }
  if (!Array.isArray(house.blocs) || house.blocs.length === 0) {
    return report(`removal.${label}.blocs must be a non-empty array`);
  }

  const keys = new Set();
  let shares = 0;

  for (const bloc of house.blocs) {
    if (!isPlainObject(bloc)) {
      report(`removal.${label} has a bloc that is not an object`);
      continue;
    }
    const name = isNonEmptyString(bloc.key) ? bloc.key : "?";
    if (!isNonEmptyString(bloc.key)) report(`removal.${label} has a bloc without a key`);
    else if (keys.has(bloc.key)) report(`removal.${label} repeats the bloc "${bloc.key}"`);
    else keys.add(bloc.key);

    if (!(Number.isFinite(bloc.share) && bloc.share > 0 && bloc.share <= 1)) {
      report(`removal.${label} bloc "${name}" needs a share between 0 and 1`);
    } else {
      shares += bloc.share;
    }
    if (!Number.isFinite(bloc.intercept)) {
      report(`removal.${label} bloc "${name}" needs a numeric intercept`);
    }
    if (bloc.weights !== undefined && !isPlainObject(bloc.weights)) {
      report(`removal.${label} bloc "${name}" weights must be an object`);
      continue;
    }
    for (const [driver, weight] of Object.entries(bloc.weights ?? {})) {
      if (!LEGISLATIVE_DRIVERS.includes(driver)) {
        report(`removal.${label} bloc "${name}" weighs unknown driver "${driver}"`);
      } else if (!Number.isFinite(weight)) {
        report(`removal.${label} bloc "${name}" weight for "${driver}" must be a number`);
      }
    }
  }

  if (Math.abs(shares - 1) > 0.001) {
    report(`removal.${label} bloc shares must add up to 1 (they add up to ${shares.toFixed(3)})`);
  }
}

function validateRemoval(removal, report) {
  if (removal === undefined) return;
  if (!isPlainObject(removal)) return report("removal must be an object");

  validateRemovalHouse(removal.chamber, "chamber", report);
  validateRemovalHouse(removal.senate, "senate", report);

  // A threshold nobody can reach, or one already met by an empty house, is a broken procedure.
  const thresholds = [
    ["chamber.authorizationVotes", removal.chamber?.seats, removal.chamber?.authorizationVotes],
    ["senate.admissibilityVotes", removal.senate?.seats, removal.senate?.admissibilityVotes],
    ["senate.convictionVotes", removal.senate?.seats, removal.senate?.convictionVotes],
  ];
  for (const [name, seats, votes] of thresholds) {
    if (!isIntegerAtLeast(votes, 1)) report(`removal.${name} must be a positive integer`);
    else if (Number.isInteger(seats) && votes > seats) {
      report(`removal.${name} (${votes}) cannot exceed the ${seats} seats of the house`);
    }
  }

  if (!isIntegerAtLeast(removal.suspensionTurns, 1)) {
    report("removal.suspensionTurns must be a positive integer");
  }
}

function validateCountries(countries, flags, errors) {
  if (!isPlainObject(countries)) {
    errors.push("countries must be an object");
    return;
  }
  if (!Object.values(countries).some((country) => country?.playable)) {
    errors.push("countries must include at least one playable country");
  }

  for (const [code, country] of Object.entries(countries)) {
    const report = (message) => errors.push(`country "${code}": ${message}`);
    if (!COUNTRY_CODE_PATTERN.test(code)) report("code must be two uppercase letters");
    if (!isPlainObject(country)) {
      report("must be an object");
      continue;
    }
    if (country.countryCode !== code) report("countryCode must match its key");
    if (typeof country.playable !== "boolean") report("playable must be a boolean");
    for (const field of ["name", "longName", "system", "summary"]) {
      if (!isNonEmptyString(country[field])) report(`${field} must be a non-empty string`);
    }
    if (!isPlainObject(country.office) || !isNonEmptyString(country.office.title)) {
      report("office must name the head of government");
    } else if (country.office.role !== PRESIDENT_ROLE) {
      report(`unknown office role "${country.office.role}"`);
    }

    // A pack that cannot be played carries no rules on purpose; nothing else is required of it.
    if (!country.playable) continue;

    if (!isNonEmptyString(country.oath)) report("oath must be a non-empty string");
    if (country.office.termMonths !== MANDATE_TURNS) {
      report(`termMonths must be ${MANDATE_TURNS} while the engine has a single mandate length`);
    }
    if (!Array.isArray(country.regions) || !country.regions.every(isNonEmptyString)) {
      report("regions must be an array of strings");
    }
    const runoff = country.electoralRules?.runoffThreshold;
    if (!(Number.isFinite(runoff) && runoff > 0 && runoff <= 100)) {
      report("electoralRules.runoffThreshold must be a percentage");
    }
    for (const meter of METERS) {
      if (!isNonEmptyString(country.terminology?.pillars?.[meter])) {
        report(`terminology.pillars is missing "${meter}"`);
      }
    }

    const context = { flags, regions: Array.isArray(country.regions) ? country.regions : [] };
    if (!isPlainObject(country.candidateOptions)) {
      report("candidateOptions must be an object");
    } else {
      for (const [group, options] of Object.entries(country.candidateOptions)) {
        if (!Array.isArray(options) || options.length === 0) {
          report(`candidateOptions.${group} must be a non-empty array`);
          continue;
        }
        const keys = new Set();
        for (const option of options) {
          validateCountryOption(option, `candidate ${group} option`, context, report);
          if (keys.has(option?.key)) report(`duplicate candidate ${group} option "${option.key}"`);
          else keys.add(option?.key);
        }
      }
    }
    validateRemoval(country.removal, report);
    validateCountryCampaign(country.campaign, context, report);
  }
}

export function validateContent({ cards, flags, characters, endings, epithets, countries }) {
  const errors = [];
  const warnings = [];

  const nonPlain = findNonPlainData(
    { cards, flags, characters, endings, epithets, countries },
    "content",
  );
  if (nonPlain) errors.push(`${nonPlain} must be plain data (no functions or executable values)`);

  validateCountries(countries, isPlainObject(flags) ? flags : {}, errors);
  validateCharacters(characters, errors);
  validateFlags(flags, errors);
  validateTextEntries(endings, ENDING_CODES, ["title", "text"], "ending", errors);
  validateTextEntries(epithets, EPITHET_CODES, ["title"], "epithet", errors);
  validateCards(
    cards,
    {
      flags: isPlainObject(flags) ? flags : {},
      characters: isPlainObject(characters) ? characters : {},
      countries: isPlainObject(countries) ? countries : {},
    },
    errors,
    warnings,
  );

  return { errors, warnings };
}
