import { INITIAL_METER_VALUE, METER_MAX, METER_MIN, METERS } from "./constants.js";

// Reading bands from GDD §8.5; `max` is inclusive.
const BANDS = [
  { max: 0, band: "collapsed_low" },
  { max: 14, band: "critical_low" },
  { max: 29, band: "unstable_low" },
  { max: 70, band: "governable" },
  { max: 85, band: "unstable_high" },
  { max: 99, band: "critical_high" },
  { max: METER_MAX, band: "collapsed_high" },
];

export function createInitialMeters(value = INITIAL_METER_VALUE) {
  return Object.fromEntries(METERS.map((meter) => [meter, value]));
}

export function clampMeter(value, min = METER_MIN, max = METER_MAX) {
  return Math.min(max, Math.max(min, value));
}

export function getMeterBand(value) {
  return BANDS.find((entry) => value <= entry.max)?.band ?? "collapsed_high";
}

// Arrow strength shown before a decision (GDD §9).
export function getTrend(delta) {
  const magnitude = Math.abs(delta);
  if (magnitude === 0) return { direction: "none", strength: 0 };

  const strength = magnitude <= 3 ? 1 : magnitude <= 7 ? 2 : 3;
  return { direction: delta > 0 ? "up" : "down", strength };
}
