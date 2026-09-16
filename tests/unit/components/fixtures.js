// API-shaped test data for UI components (the shapes returned by src/services/gameViews.js).
function effect(delta) {
  const magnitude = Math.abs(delta);
  return {
    delta,
    direction: delta === 0 ? "none" : delta > 0 ? "up" : "down",
    strength: magnitude === 0 ? 0 : magnitude <= 3 ? 1 : magnitude <= 7 ? 2 : 3,
  };
}

function effects(people, market, congress, institutions) {
  return {
    people: effect(people),
    market: effect(market),
    congress: effect(congress),
    institutions: effect(institutions),
  };
}

export function buildGameView(overrides = {}) {
  return {
    id: "3f0c2a8e-0000-4000-8000-000000000001",
    role: "president",
    status: "active",
    turn: 7,
    calendar: { year: 1, monthIndex: 6 },
    startYear: 1,
    meters: {
      people: { value: 35, band: "governable" },
      market: { value: 60, band: "governable" },
      congress: { value: 50, band: "governable" },
      institutions: { value: 12, band: "critical_low" },
    },
    mandateCompleted: false,
    endingCode: null,
    previousGameId: null,
    ...overrides,
  };
}

export function buildSpeakerView(overrides = {}) {
  return {
    id: "otavio-leme",
    name: "General Otávio Leme",
    title: "Chefe das Forças de Defesa",
    initials: "OL",
    portrait: { src: "/assets/characters/otavio-leme.webp", position: "50% 24%" },
    accent: null,
    ...overrides,
  };
}

export function buildCardView(overrides = {}) {
  return {
    slug: "security_march",
    type: "common",
    category: "security",
    isCrisis: false,
    speaker: buildSpeakerView(),
    text: "Após uma onda de violência, manifestantes pedem patrulhamento militar temporário nas grandes cidades.",
    choices: {
      left: { label: "Autorizar patrulhas", effects: effects(4, 1, 2, -7) },
      right: { label: "Reforçar polícia civil", effects: effects(-2, -3, -1, 6) },
    },
    ...overrides,
  };
}

export function buildFeedback(overrides = {}) {
  return {
    decision: {
      turn: 7,
      calendar: { year: 1, monthIndex: 6 },
      choice: "right",
      choiceLabel: "Reforçar polícia civil",
      speaker: buildSpeakerView(),
      metersBefore: { people: 35, market: 60, congress: 50, institutions: 12 },
      metersAfter: { people: 33, market: 57, congress: 49, institutions: 18 },
      flagChanges: [],
    },
    effects: { people: -2, market: -3, congress: -1, institutions: 6 },
    resultText: "A polícia civil recebe reforços, mas os resultados demoram a aparecer.",
    consequence: null,
    ...overrides,
  };
}
