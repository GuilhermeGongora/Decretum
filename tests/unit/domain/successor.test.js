import { buildSuccessorStart } from "@/src/domain/successor";
import { buildFlag } from "./fixtures";

function legacyFlag(legacyPriority, successorEffects, overrides = {}) {
  return buildFlag({ legacy: true, legacyPriority, successorEffects, ...overrides });
}

describe("buildSuccessorStart", () => {
  it("starts every pillar at 50 when there is no legacy", () => {
    expect(buildSuccessorStart({ temporary: buildFlag() })).toEqual({
      meters: { people: 50, market: 50, congress: 50, institutions: 50 },
      modifiers: { people: 0, market: 0, congress: 0, institutions: 0 },
      flags: {},
      inherited: [],
    });
  });

  it("inherits only legacy flags and applies their modifiers", () => {
    const result = buildSuccessorStart({
      tax_reform_approved: legacyFlag(50, { people: 1, market: 4, congress: -3, institutions: 2 }),
      temporary: buildFlag(),
    });

    expect(result.meters).toEqual({ people: 51, market: 54, congress: 47, institutions: 52 });
    expect(Object.keys(result.flags)).toEqual(["tax_reform_approved"]);
    expect(result.inherited).toEqual([
      {
        key: "tax_reform_approved",
        label: "Marca política",
        successorEffects: { people: 1, market: 4, congress: -3, institutions: 2 },
      },
    ]);
  });

  it("marks inherited flags as permanent, inherited and no longer legacy", () => {
    const { flags } = buildSuccessorStart({
      reform: legacyFlag(10, { market: 2 }, { setAtTurn: 30 }),
    });

    expect(flags.reform).toMatchObject({
      value: true,
      legacy: false,
      inherited: true,
      setAtTurn: 1,
      expiresAtTurn: null,
    });
  });

  it("limits each pillar to the 40–60 range", () => {
    const result = buildSuccessorStart({
      a: legacyFlag(10, { market: -8 }),
      b: legacyFlag(9, { market: -8 }),
      c: legacyFlag(8, { people: 15 }),
    });

    expect(result.meters).toMatchObject({ market: 40, people: 60 });
    expect(result.modifiers).toMatchObject({ market: -16, people: 15 });
  });

  it("inherits at most five flags, preferring higher legacyPriority and then key order", () => {
    const flags = {
      f1: legacyFlag(1, { people: 1 }),
      f2: legacyFlag(2, { people: 1 }),
      f3b: legacyFlag(3, { people: 1 }),
      f3a: legacyFlag(3, { people: 1 }),
      f5: legacyFlag(5, { people: 1 }),
      f6: legacyFlag(6, { people: 1 }),
      f7: legacyFlag(7, { people: 1 }),
    };

    const result = buildSuccessorStart(flags);

    expect(result.inherited.map((flag) => flag.key)).toEqual(["f7", "f6", "f5", "f3a", "f3b"]);
    expect(result.meters.people).toBe(55);
  });
});
