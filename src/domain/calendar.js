import { MONTHS_PER_YEAR } from "./constants.js";

export function getCalendar(turn) {
  if (!Number.isInteger(turn) || turn < 1) {
    throw new RangeError(`Invalid turn: ${turn}`);
  }

  return {
    year: Math.floor((turn - 1) / MONTHS_PER_YEAR) + 1,
    monthIndex: (turn - 1) % MONTHS_PER_YEAR,
  };
}
