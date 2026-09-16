import { METERS, PRESIDENT_ROLE } from "../domain/constants.js";
import { cardDefinitions } from "./cards.js";
import { characters } from "./characters.js";
import { countries } from "./countries/index.js";
import { endingDefinitions } from "./endings.js";
import { epithetDefinitions } from "./epithets.js";
import { flagCatalog } from "./flags.js";
import { validateContent } from "./validate.js";

const fullEffects = (effects = {}) =>
  Object.fromEntries(METERS.map((meter) => [meter, effects[meter] ?? 0]));

function compileChoice(choice, flags) {
  return {
    label: choice.label,
    resultText: choice.resultText,
    headline: choice.headline ?? null,
    reaction: choice.reaction ?? null,
    effects: fullEffects(choice.effects),
    conditionalEffects: (choice.conditionalEffects ?? []).map((operation) => ({ ...operation })),
    // Catalog metadata is copied into each choice so a decision snapshot is self-contained.
    setFlags: (choice.setFlags ?? []).map((entry) => {
      const definition = flags[entry.key];
      return {
        key: entry.key,
        value: entry.value ?? true,
        expiresAfterTurns: entry.expiresAfterTurns ?? null,
        label: definition.label,
        legacy: definition.legacy ?? false,
        legacyPriority: definition.legacyPriority ?? 0,
        successorEffects: definition.legacy ? fullEffects(definition.successorEffects) : null,
      };
    }),
    removeFlags: [...(choice.removeFlags ?? [])],
    schedule: (choice.schedule ?? []).map((entry) => ({
      cardSlug: entry.cardSlug,
      delayTurns: entry.delayTurns,
      priority: entry.priority ?? 0,
    })),
  };
}

export function compileCard(definition, { flags, characters: characterMap }) {
  const character = characterMap[definition.speaker];
  const conditions = definition.conditions ?? {};

  return {
    slug: definition.slug,
    version: definition.version ?? 1,
    role: definition.role ?? PRESIDENT_ROLE,
    type: definition.type,
    // Name and title are copied so decision snapshots keep the text shown at the time; artwork is
    // resolved from the registry by id when a view is built.
    speaker: { id: definition.speaker, name: character.name, title: character.role },
    category: definition.category,
    text: definition.text,
    weight: definition.weight,
    cooldownTurns: definition.cooldownTurns,
    uniquePerGame: definition.uniquePerGame ?? false,
    active: definition.active ?? true,
    tags: [...(definition.tags ?? [])],
    conditions: {
      allFlags: [...(conditions.allFlags ?? [])],
      anyFlags: [...(conditions.anyFlags ?? [])],
      noneFlags: [...(conditions.noneFlags ?? [])],
      minTurn: conditions.minTurn ?? 1,
      maxTurn: conditions.maxTurn ?? 48,
      meters: structuredClone(conditions.meters ?? {}),
      anyMeters: structuredClone(conditions.anyMeters ?? []),
    },
    choices: {
      left: compileChoice(definition.leftChoice, flags),
      right: compileChoice(definition.rightChoice, flags),
    },
  };
}

let cachedContent = null;

// Validates and compiles the versioned content. Throws when content is invalid.
export function loadContent() {
  if (cachedContent) return cachedContent;

  const source = {
    cards: cardDefinitions,
    flags: flagCatalog,
    characters,
    endings: endingDefinitions,
    epithets: epithetDefinitions,
    countries,
  };
  const { errors, warnings } = validateContent(source);
  if (errors.length > 0) {
    throw new Error(`Invalid game content:\n- ${errors.join("\n- ")}`);
  }

  cachedContent = Object.freeze({
    cards: cardDefinitions.map((definition) => compileCard(definition, source)),
    flags: flagCatalog,
    endings: endingDefinitions,
    epithets: epithetDefinitions,
    countries,
    warnings,
  });

  return cachedContent;
}
