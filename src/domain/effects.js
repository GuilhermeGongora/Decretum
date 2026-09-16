import { METER_CENTER, METERS } from "./constants.js";
import { clampMeter } from "./meters.js";

function bySide(value, below, above) {
  if (value < METER_CENTER) return below;
  if (value > METER_CENTER) return above;
  return 0;
}

// Generic, data-driven operations (GDD §18.4). Content can only name one of these.
const OPERATIONS = {
  toward_center: (operation, value) => bySide(value, operation.amount, -operation.amount),
  away_from_center: (operation, value) => bySide(value, -operation.amount, operation.amount),
  by_side: (operation, value) => bySide(value, operation.below, operation.above),
};

export const EFFECT_OPERATIONS = Object.freeze(Object.keys(OPERATIONS));

export function resolveChoiceDeltas(choice, meters) {
  const deltas = Object.fromEntries(METERS.map((meter) => [meter, choice.effects?.[meter] ?? 0]));

  for (const operation of choice.conditionalEffects ?? []) {
    if (!Object.hasOwn(OPERATIONS, operation.type)) {
      throw new TypeError(`Unknown effect operation: ${operation.type}`);
    }
    if (!METERS.includes(operation.meter)) {
      throw new TypeError(`Unknown pillar in effect operation: ${operation.meter}`);
    }
    deltas[operation.meter] += OPERATIONS[operation.type](operation, meters[operation.meter]);
  }

  return deltas;
}

// All deltas are applied to the same starting values (GDD §8.6).
export function applyDeltas(meters, deltas) {
  const raw = Object.fromEntries(METERS.map((meter) => [meter, meters[meter] + deltas[meter]]));
  const clamped = Object.fromEntries(METERS.map((meter) => [meter, clampMeter(raw[meter])]));

  return { raw, meters: clamped };
}
