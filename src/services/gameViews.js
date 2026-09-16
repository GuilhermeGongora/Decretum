// Maps engine and persistence shapes to API responses. No game rules are decided here.
import { getCharacter } from "@/src/content/characters";
import { getCalendar } from "@/src/domain/calendar";
import { METERS } from "@/src/domain/constants";
import { resolveChoiceDeltas } from "@/src/domain/effects";
import { getMeterBand, getTrend } from "@/src/domain/meters";

export function toMetersView(meters) {
  return Object.fromEntries(
    METERS.map((meter) => [meter, { value: meters[meter], band: getMeterBand(meters[meter]) }]),
  );
}

export function toGameView(game) {
  return {
    id: game.id,
    role: game.role,
    status: game.status,
    turn: game.turn,
    calendar: getCalendar(game.turn),
    startYear: game.startYear,
    meters: toMetersView(game.meters),
    mandateCompleted: game.mandateCompleted,
    endingCode: game.endingCode,
    previousGameId: game.previousGameId,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    endedAt: game.endedAt,
  };
}

// Name and title come from the snapshot (history keeps what was shown); artwork comes from the character
// registry by stable id. Snapshots without a known id fall back to the name's initials in the UI.
export function toSpeakerView(speaker) {
  const character = getCharacter(speaker.id);
  return {
    id: speaker.id ?? null,
    name: speaker.name,
    title: speaker.title,
    initials: character?.initials ?? null,
    portrait: character?.portrait
      ? { src: character.portrait, position: character.portraitPosition }
      : null,
    accent: character?.accent ?? null,
  };
}

// Deltas are resolved on the server for the current pillars; the client never sends them back.
function toChoiceView(choice, meters) {
  const deltas = resolveChoiceDeltas(choice, meters);
  return {
    label: choice.label,
    effects: Object.fromEntries(
      METERS.map((meter) => [meter, { delta: deltas[meter], ...getTrend(deltas[meter]) }]),
    ),
  };
}

export function toCardView(card, meters) {
  return {
    slug: card.slug,
    type: card.type,
    category: card.category,
    isCrisis: card.type === "crisis",
    speaker: toSpeakerView(card.speaker),
    text: card.text,
    choices: {
      left: toChoiceView(card.choices.left, meters),
      right: toChoiceView(card.choices.right, meters),
    },
  };
}

// Scheduled follow-ups stay hidden: the GDD reveals consequences only through narrative (§9).
export function toDecisionView(decision) {
  return {
    turn: decision.turn,
    calendar: getCalendar(decision.turn),
    cardSlug: decision.cardSlug,
    speaker: toSpeakerView(decision.speaker),
    cardText: decision.cardText,
    choice: decision.choice,
    choiceLabel: decision.choiceLabel,
    resultText: decision.resultText,
    // Persisted snapshot; null for decisions recorded without an authored consequence.
    consequence: decision.consequence
      ? { headline: decision.consequence.headline, reaction: decision.consequence.reaction }
      : null,
    deltas: decision.deltas,
    metersBefore: decision.metersBefore,
    metersAfter: decision.metersAfter,
    flagChanges: decision.flagChanges.map(({ type, key, label }) => ({ type, key, label })),
  };
}

export function toEndingView(code, endings) {
  if (!code) return null;
  const ending = endings[code];
  return { code, kind: ending.kind, title: ending.title, text: ending.text };
}

export function toSummaryView(summary, { endings, epithets }) {
  return {
    ending: toEndingView(summary.endingCode, endings),
    primaryMeter: summary.primaryMeter,
    simultaneousCrises: summary.simultaneousEndingCodes.map((code) => toEndingView(code, endings)),
    mandateCompleted: summary.mandateCompleted,
    duration: summary.duration,
    finalMeters: toMetersView(summary.finalMeters),
    decisionsCount: summary.decisionsCount,
    topDecisions: summary.topDecisions.map((entry) => ({
      turn: entry.turn,
      calendar: getCalendar(entry.turn),
      speaker: toSpeakerView(entry.speaker),
      choiceLabel: entry.choiceLabel,
      deltas: entry.deltas,
      impact: entry.impact,
    })),
    legacyFlags: summary.legacyFlags,
    score: summary.score,
    epithet: { code: summary.epithetCode, title: epithets[summary.epithetCode].title },
  };
}
