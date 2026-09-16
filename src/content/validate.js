import {
  CARD_CATEGORIES,
  CARD_TYPES,
  ENDING_CODES,
  EPITHET_CODES,
  MANDATE_TURNS,
  METER_MAX,
  METER_MIN,
  METERS,
  PRESIDENT_ROLE,
} from "../domain/constants.js";
import { EFFECT_OPERATIONS } from "../domain/effects.js";

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

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
];
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
];
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

function validateChoice(choice, side, context, report, warn) {
  const at = (message) => report(`${side} ${message}`);
  if (!isPlainObject(choice)) return at("must be an object");

  rejectUnknownFields(choice, CHOICE_FIELDS, at);
  if (!isNonEmptyString(choice.label)) at("label must be a non-empty string");
  if (!isNonEmptyString(choice.resultText)) at("resultText must be a non-empty string");

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
  const scheduled = new Set();

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

export function validateContent({ cards, flags, characters, endings, epithets }) {
  const errors = [];
  const warnings = [];

  const nonPlain = findNonPlainData({ cards, flags, characters, endings, epithets }, "content");
  if (nonPlain) errors.push(`${nonPlain} must be plain data (no functions or executable values)`);

  validateCharacters(characters, errors);
  validateFlags(flags, errors);
  validateTextEntries(endings, ENDING_CODES, ["title", "text"], "ending", errors);
  validateTextEntries(epithets, EPITHET_CODES, ["title"], "epithet", errors);
  validateCards(
    cards,
    {
      flags: isPlainObject(flags) ? flags : {},
      characters: isPlainObject(characters) ? characters : {},
    },
    errors,
    warnings,
  );

  return { errors, warnings };
}
