import { ENDING_PRECEDENCE, METER_CENTER, METERS } from "./constants.js";

const SURVIVAL_POINTS_PER_MONTH = 100;
const COMPLETION_BONUS = 2500;
const BALANCE_MULTIPLIER = 20;
const EQUILIBRIST_MIN_STABILITY = 75;
const BRIEF_GOVERNMENT_BEFORE_MONTH = 12;
const SURVIVOR_FROM_MONTH = 36;

const PILLAR_EPITHETS = Object.freeze({
  people: "voice_of_the_streets",
  market: "economy_guarantor",
  congress: "coalition_master",
  institutions: "charter_guardian",
});

// Equivalent to mean(1 - |v - 50| / 50) × 100 (GDD §15.1), computed with integers first.
export function calculateMonthStability(meters) {
  const total = METERS.reduce(
    (sum, meter) => sum + (METER_CENTER - Math.abs(meters[meter] - METER_CENTER)),
    0,
  );
  return (total * 100) / (METER_CENTER * METERS.length);
}

function calculateAverageStability(meterSnapshots) {
  if (meterSnapshots.length === 0) return 0;
  const total = meterSnapshots.reduce((sum, meters) => sum + calculateMonthStability(meters), 0);
  return total / meterSnapshots.length;
}

export function calculateScore({ meterSnapshots, monthsSurvived, mandateCompleted }) {
  const averageStability = calculateAverageStability(meterSnapshots);
  const survivalScore = monthsSurvived * SURVIVAL_POINTS_PER_MONTH;
  const completionBonus = mandateCompleted ? COMPLETION_BONUS : 0;
  const balanceBonus = Math.round(averageStability * BALANCE_MULTIPLIER);

  return {
    survivalScore,
    completionBonus,
    averageStability,
    balanceBonus,
    score: survivalScore + completionBonus + balanceBonus,
  };
}

function dominantPillar(meterSnapshots) {
  let dominant = ENDING_PRECEDENCE[0];
  let highestTotal = -Infinity;

  // Totals over the same number of snapshots rank like averages, without float noise.
  for (const meter of ENDING_PRECEDENCE) {
    const total = meterSnapshots.reduce((sum, meters) => sum + meters[meter], 0);
    if (total > highestTotal) {
      dominant = meter;
      highestTotal = total;
    }
  }

  return dominant;
}

// Precedence between epithets is not defined by the GDD; see docs/game-rules.md.
export function chooseEpithet({ meterSnapshots, monthsSurvived, mandateCompleted }) {
  if (mandateCompleted && calculateAverageStability(meterSnapshots) >= EQUILIBRIST_MIN_STABILITY) {
    return "equilibrist";
  }
  if (!mandateCompleted && monthsSurvived < BRIEF_GOVERNMENT_BEFORE_MONTH) {
    return "brief_government";
  }
  if (!mandateCompleted && monthsSurvived >= SURVIVOR_FROM_MONTH) {
    return "survivor";
  }
  return PILLAR_EPITHETS[dominantPillar(meterSnapshots)];
}
