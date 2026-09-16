const NEUTRAL_EFFECTS = Object.freeze({ people: 0, market: 0, congress: 0, institutions: 0 });

export function buildChoice(overrides = {}) {
  return {
    label: "Escolher",
    resultText: "Algo acontece.",
    conditionalEffects: [],
    setFlags: [],
    removeFlags: [],
    schedule: [],
    ...overrides,
    effects: { ...NEUTRAL_EFFECTS, ...overrides.effects },
  };
}

export function buildCard(overrides = {}) {
  const { choices = {}, conditions = {}, ...rest } = overrides;
  return {
    slug: "card",
    version: 1,
    role: "president",
    type: "common",
    speaker: { id: "helena-vasque", name: "Helena Vasque", title: "Ministra-chefe da Casa Civil" },
    category: "budget",
    text: "Um dilema.",
    weight: 10,
    cooldownTurns: 0,
    uniquePerGame: false,
    active: true,
    tags: [],
    ...rest,
    conditions: {
      allFlags: [],
      anyFlags: [],
      noneFlags: [],
      minTurn: 1,
      maxTurn: 48,
      meters: {},
      anyMeters: [],
      ...conditions,
    },
    choices: { left: buildChoice(choices.left), right: buildChoice(choices.right) },
  };
}

export function buildMeters(overrides = {}) {
  return { people: 50, market: 50, congress: 50, institutions: 50, ...overrides };
}

export function buildFlag(overrides = {}) {
  return {
    value: true,
    label: "Marca política",
    legacy: false,
    legacyPriority: 0,
    successorEffects: null,
    setAtTurn: 1,
    expiresAtTurn: null,
    inherited: false,
    ...overrides,
  };
}

export function buildFlagDefinition(overrides = {}) {
  return {
    key: "flag",
    value: true,
    expiresAfterTurns: null,
    label: "Marca política",
    legacy: false,
    legacyPriority: 0,
    successorEffects: null,
    ...overrides,
  };
}

export function buildActiveState(overrides = {}) {
  return {
    role: "president",
    status: "active",
    turn: 5,
    meters: buildMeters(),
    flags: {},
    currentCardSlug: "card",
    lastCardSlug: null,
    previousGameId: null,
    mandateCompleted: false,
    endingCode: null,
    simultaneousEndingCodes: [],
    rngSeed: "test-seed",
    ...overrides,
  };
}

export function sequenceRng(values) {
  let index = 0;
  return () => values[index++ % values.length];
}
