import {
  INITIAL_METER_VALUE,
  MAX_INHERITED_FLAGS,
  METERS,
  SUCCESSOR_METER_BOUNDS,
} from "./constants.js";
import { isFlagActive } from "./flags.js";
import { clampMeter } from "./meters.js";

function compareLegacy([keyA, flagA], [keyB, flagB]) {
  if (flagB.legacyPriority !== flagA.legacyPriority) {
    return flagB.legacyPriority - flagA.legacyPriority;
  }
  if (keyA < keyB) return -1;
  if (keyA > keyB) return 1;
  return 0;
}

// GDD §16: only legacy flags pass on, at most five, and every pillar starts within 40–60.
export function buildSuccessorStart(previousFlags) {
  const legacy = Object.entries(previousFlags)
    .filter(([key, flag]) => flag.legacy && isFlagActive(previousFlags, key))
    .sort(compareLegacy)
    .slice(0, MAX_INHERITED_FLAGS);

  const modifiers = Object.fromEntries(METERS.map((meter) => [meter, 0]));
  for (const [, flag] of legacy) {
    for (const meter of METERS) {
      modifiers[meter] += flag.successorEffects?.[meter] ?? 0;
    }
  }

  const meters = Object.fromEntries(
    METERS.map((meter) => [
      meter,
      clampMeter(
        INITIAL_METER_VALUE + modifiers[meter],
        SUCCESSOR_METER_BOUNDS.min,
        SUCCESSOR_METER_BOUNDS.max,
      ),
    ]),
  );

  // Inherited flags are not legacy again, so a legacy passes on for one generation only.
  const flags = Object.fromEntries(
    legacy.map(([key, flag]) => [
      key,
      { ...flag, legacy: false, inherited: true, setAtTurn: 1, expiresAtTurn: null },
    ]),
  );

  const inherited = legacy.map(([key, flag]) => ({
    key,
    label: flag.label,
    successorEffects: flag.successorEffects,
  }));

  return { meters, modifiers, flags, inherited };
}
