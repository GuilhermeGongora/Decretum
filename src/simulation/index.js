// Development-only balance simulator (GDD §19.3). Not used by the application runtime.
import { METER_CENTER, METERS } from "../domain/constants.js";
import { applyDeltas, resolveChoiceDeltas } from "../domain/effects.js";
import { createRng } from "../domain/rng.js";
import { applyEventChanges, resolveTurn, startGame } from "../domain/turn.js";

function distanceFromCenter(meters) {
  return METERS.reduce((sum, meter) => sum + Math.abs(meters[meter] - METER_CENTER), 0);
}

function metersAfter(card, side, meters) {
  return applyDeltas(meters, resolveChoiceDeltas(card.choices[side], meters)).meters;
}

function favor(meter) {
  return ({ card, state }) => {
    const left = resolveChoiceDeltas(card.choices.left, state.meters)[meter];
    const right = resolveChoiceDeltas(card.choices.right, state.meters)[meter];
    return right > left ? "right" : "left";
  };
}

export const POLICIES = Object.freeze({
  random: ({ rng }) => (rng() < 0.5 ? "left" : "right"),
  center: ({ card, state }) =>
    distanceFromCenter(metersAfter(card, "right", state.meters)) <
    distanceFromCenter(metersAfter(card, "left", state.meters))
      ? "right"
      : "left",
  favor_people: favor("people"),
  favor_market: favor("market"),
  favor_congress: favor("congress"),
  favor_institutions: favor("institutions"),
  alternate: ({ state }) => (state.turn % 2 === 1 ? "left" : "right"),
});

export function simulateGame({ cards, policy, seed }) {
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const policyRng = createRng(`${seed}:policy`);
  const started = startGame({ cards, rngSeed: seed });

  let { state } = started;
  let appearances = [started.appearance];
  let scheduledEvents = [];
  const decisions = [];
  let fallbackCount = 0;

  while (state.status === "active") {
    const card = cardsBySlug.get(state.currentCardSlug);
    const choice = policy({ card, state, rng: policyRng });
    const result = resolveTurn({ state, cards, choice, appearances, scheduledEvents });

    decisions.push({
      turn: state.turn,
      cardSlug: card.slug,
      choice,
      metersAfter: result.decision.metersAfter,
    });
    fallbackCount += result.warnings.length;
    scheduledEvents = applyEventChanges(scheduledEvents, result.eventChanges);
    if (result.appearance) appearances = [...appearances, result.appearance];
    state = result.state;
  }

  return {
    seed,
    status: state.status,
    endingCode: state.endingCode,
    months: decisions.length,
    decisions,
    fallbackCount,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function summarizeSimulations(results) {
  const months = results.map((result) => result.months);
  const endings = {};
  const cardFrequency = {};
  const maxAppearancesPerGame = {};
  const choices = { left: 0, right: 0 };
  const meterTotalsByTurn = new Map();

  for (const result of results) {
    endings[result.endingCode] = (endings[result.endingCode] ?? 0) + 1;
    const perGame = {};

    for (const decision of result.decisions) {
      cardFrequency[decision.cardSlug] = (cardFrequency[decision.cardSlug] ?? 0) + 1;
      perGame[decision.cardSlug] = (perGame[decision.cardSlug] ?? 0) + 1;
      choices[decision.choice] += 1;

      const totals = meterTotalsByTurn.get(decision.turn) ?? {
        count: 0,
        people: 0,
        market: 0,
        congress: 0,
        institutions: 0,
      };
      totals.count += 1;
      for (const meter of METERS) totals[meter] += decision.metersAfter[meter];
      meterTotalsByTurn.set(decision.turn, totals);
    }

    for (const [slug, count] of Object.entries(perGame)) {
      maxAppearancesPerGame[slug] = Math.max(maxAppearancesPerGame[slug] ?? 0, count);
    }
  }

  const averageMetersByTurn = [...meterTotalsByTurn.entries()]
    .sort(([a], [b]) => a - b)
    .map(([turn, totals]) => ({
      turn,
      ...Object.fromEntries(
        METERS.map((meter) => [meter, Math.round(totals[meter] / totals.count)]),
      ),
    }));

  return {
    games: results.length,
    averageMonths: results.length
      ? months.reduce((sum, value) => sum + value, 0) / results.length
      : 0,
    medianMonths: results.length ? median(months) : 0,
    completionRate: results.length
      ? results.filter((result) => result.status === "completed").length / results.length
      : 0,
    endings,
    cardFrequency,
    maxAppearancesPerGame,
    choices,
    averageMetersByTurn,
    fallbackSelections: results.reduce((sum, result) => sum + result.fallbackCount, 0),
  };
}
