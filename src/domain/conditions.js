import { MANDATE_TURNS, METER_MAX, METER_MIN } from "./constants.js";
import { isFlagActive } from "./flags.js";

function inRange(meters, meter, { min = METER_MIN, max = METER_MAX }) {
  return meters[meter] >= min && meters[meter] <= max;
}

// A card may require a constitutional procedure to be at a given stage. `procedure` is null when the
// government has none, which is what makes the ordinary deck the default.
function matchesProcedure(rule, procedure) {
  if (rule.active === false) return procedure === null;
  if (procedure === null) return false;
  if (rule.type !== undefined && rule.type !== procedure.type) return false;
  if (rule.stages !== undefined && !rule.stages.includes(procedure.stage)) return false;
  if (rule.notStages !== undefined && rule.notStages.includes(procedure.stage)) return false;
  return true;
}

export function meetsConditions(conditions, { turn, flags, meters, procedure = null }) {
  const {
    allFlags = [],
    anyFlags = [],
    noneFlags = [],
    minTurn = 1,
    maxTurn = MANDATE_TURNS,
    meters: meterRanges = {},
    anyMeters = [],
    procedure: procedureRule,
  } = conditions;

  if (turn < minTurn || turn > maxTurn) return false;
  if (procedureRule !== undefined && !matchesProcedure(procedureRule, procedure)) return false;

  const active = (key) => isFlagActive(flags, key);
  if (!allFlags.every(active)) return false;
  if (anyFlags.length > 0 && !anyFlags.some(active)) return false;
  if (noneFlags.some(active)) return false;

  const metersMatch = Object.entries(meterRanges).every(([meter, range]) =>
    inRange(meters, meter, range),
  );
  if (!metersMatch) return false;

  if (anyMeters.length > 0 && !anyMeters.some((range) => inRange(meters, range.meter, range))) {
    return false;
  }

  return true;
}
