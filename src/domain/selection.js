import { NoEligibleCardError } from "../errors/index.js";
import { meetsConditions } from "./conditions.js";
import { EVENT_STATUS } from "./constants.js";

function compareSlugs(a, b) {
  if (a.slug < b.slug) return -1;
  if (a.slug > b.slug) return 1;
  return 0;
}

function lastShownTurn(slug, appearances) {
  let last = null;
  for (const appearance of appearances) {
    if (appearance.cardSlug === slug && (last === null || appearance.turn > last)) {
      last = appearance.turn;
    }
  }
  return last;
}

// GDD §11.4: shown on turn t, eligible again when currentTurn >= t + cooldown + 1.
function isInCooldown(card, turn, appearances) {
  const last = lastShownTurn(card.slug, appearances);
  return last !== null && turn < last + card.cooldownTurns + 1;
}

function isPlayable(card, context) {
  if (!card.active || card.role !== context.role) return false;
  if (card.uniquePerGame && lastShownTurn(card.slug, context.appearances) !== null) return false;
  return meetsConditions(card.conditions, context);
}

function pickWeighted(cards, rng) {
  const total = cards.reduce((sum, card) => sum + card.weight, 0);
  let threshold = rng() * total;

  for (const card of cards) {
    threshold -= card.weight;
    if (threshold < 0) return card;
  }

  return cards[cards.length - 1];
}

export function isDrawable(card) {
  return card.type !== "chained";
}

// GDD §11.1: due scheduled card, then weighted draw, then the cooldown-free fallback (§11.5).
export function selectCard(context) {
  const { cards, turn, appearances, lastCardSlug, scheduledEvents, rng } = context;
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
  const cancelledEventSequences = [];

  const dueEvents = scheduledEvents
    .filter((event) => event.status === EVENT_STATUS.PENDING && event.turnDue <= turn)
    .sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);

  for (const event of dueEvents) {
    const card = cardsBySlug.get(event.cardSlug);
    if (card && isPlayable(card, context)) {
      return {
        card,
        source: "scheduled",
        firedEventSequence: event.sequence,
        cancelledEventSequences,
        warnings: [],
      };
    }
    cancelledEventSequences.push(event.sequence);
  }

  const candidates = [...cards]
    .sort(compareSlugs)
    .filter((card) => isDrawable(card) && isPlayable(card, context));

  const drawPool = candidates.filter(
    (card) => card.slug !== lastCardSlug && !isInCooldown(card, turn, appearances),
  );

  if (drawPool.length > 0) {
    return {
      card: pickWeighted(drawPool, rng),
      source: "draw",
      firedEventSequence: null,
      cancelledEventSequences,
      warnings: [],
    };
  }

  if (candidates.length === 0) {
    throw new NoEligibleCardError(`No eligible card for turn ${turn}`);
  }

  const fallbackPool =
    candidates.length > 1 ? candidates.filter((card) => card.slug !== lastCardSlug) : candidates;

  return {
    card: pickWeighted(fallbackPool, rng),
    source: "fallback",
    firedEventSequence: null,
    cancelledEventSequences,
    warnings: [
      {
        code: "COOLDOWN_IGNORED",
        turn,
        message: "No card was eligible; cooldown was ignored to avoid a dead end.",
      },
    ],
  };
}
