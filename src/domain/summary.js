import { COLLAPSE_ENDING_CODES, METERS, MONTHS_PER_YEAR } from "./constants.js";
import { calculateScore, chooseEpithet } from "./scoring.js";

const TOP_DECISIONS = 3;

export function getEndingMeter(endingCode) {
  const match = Object.entries(COLLAPSE_ENDING_CODES).find(
    ([, codes]) => codes.low === endingCode || codes.high === endingCode,
  );
  return match ? match[0] : null;
}

function impactOf(deltas) {
  return METERS.reduce((sum, meter) => sum + Math.abs(deltas[meter]), 0);
}

// End-of-government summary (GDD §14.3 and §15).
export function buildGameSummary({ state, decisions }) {
  const monthsSurvived = decisions.length;
  const scoringInput = {
    meterSnapshots: decisions.map((decision) => decision.metersAfter),
    monthsSurvived,
    mandateCompleted: state.mandateCompleted,
  };

  const topDecisions = decisions
    .map((decision) => ({
      turn: decision.turn,
      cardSlug: decision.cardSlug,
      speaker: decision.speaker,
      choiceLabel: decision.choiceLabel,
      deltas: decision.deltas,
      impact: impactOf(decision.deltas),
    }))
    .sort((a, b) => b.impact - a.impact || a.turn - b.turn)
    .slice(0, TOP_DECISIONS);

  const legacyFlags = Object.entries(state.flags)
    .filter(([, flag]) => flag.legacy)
    .map(([key, flag]) => ({ key, label: flag.label }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));

  return {
    endingCode: state.endingCode,
    primaryMeter: getEndingMeter(state.endingCode),
    simultaneousEndingCodes: state.simultaneousEndingCodes,
    mandateCompleted: state.mandateCompleted,
    duration: {
      months: monthsSurvived,
      years: Math.floor(monthsSurvived / MONTHS_PER_YEAR),
      remainingMonths: monthsSurvived % MONTHS_PER_YEAR,
    },
    finalMeters: state.meters,
    decisionsCount: decisions.length,
    topDecisions,
    legacyFlags,
    score: calculateScore(scoringInput),
    epithetCode: chooseEpithet(scoringInput),
  };
}
