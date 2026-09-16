import { MANDATE_TURNS, METER_MAX, METER_MIN } from "./constants.js";
import { isFlagActive } from "./flags.js";

function inRange(meters, meter, { min = METER_MIN, max = METER_MAX }) {
  return meters[meter] >= min && meters[meter] <= max;
}

export function meetsConditions(conditions, { turn, flags, meters }) {
  const {
    allFlags = [],
    anyFlags = [],
    noneFlags = [],
    minTurn = 1,
    maxTurn = MANDATE_TURNS,
    meters: meterRanges = {},
    anyMeters = [],
  } = conditions;

  if (turn < minTurn || turn > maxTurn) return false;

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
