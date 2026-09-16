import { COLLAPSE_ENDING_CODES, ENDING_PRECEDENCE, METER_MAX, METER_MIN } from "./constants.js";

// GDD §12.3: the primary ending is the largest normalized excess; ties keep the fixed precedence.
export function evaluateCollapse({ raw, meters }) {
  const crises = [];

  for (const meter of ENDING_PRECEDENCE) {
    if (meters[meter] <= METER_MIN) {
      crises.push({
        meter,
        endingCode: COLLAPSE_ENDING_CODES[meter].low,
        excess: Math.abs(raw[meter]),
      });
    } else if (meters[meter] >= METER_MAX) {
      crises.push({
        meter,
        endingCode: COLLAPSE_ENDING_CODES[meter].high,
        excess: raw[meter] - METER_MAX,
      });
    }
  }

  if (crises.length === 0) return null;

  // Array#sort is stable, so equal excess preserves ENDING_PRECEDENCE order.
  crises.sort((a, b) => b.excess - a.excess);
  const [primary, ...simultaneous] = crises;

  return { primary, simultaneous };
}
