import { meetsConditions } from "@/src/domain/conditions";
import { buildFlag, buildMeters } from "./fixtures";

function context(overrides = {}) {
  return { turn: 10, flags: {}, meters: buildMeters(), ...overrides };
}

function conditions(overrides = {}) {
  return {
    allFlags: [],
    anyFlags: [],
    noneFlags: [],
    minTurn: 1,
    maxTurn: 48,
    meters: {},
    anyMeters: [],
    ...overrides,
  };
}

describe("meetsConditions", () => {
  it("accepts empty conditions", () => {
    expect(meetsConditions(conditions(), context())).toBe(true);
  });

  describe("turn window", () => {
    it.each([
      [7, false],
      [8, true],
      [12, true],
      [13, false],
    ])("with minTurn 8 and maxTurn 12, turn %i is %s", (turn, expected) => {
      expect(meetsConditions(conditions({ minTurn: 8, maxTurn: 12 }), context({ turn }))).toBe(
        expected,
      );
    });
  });

  describe("allFlags", () => {
    const required = conditions({ allFlags: ["a", "b"] });

    it("passes when every flag is active", () => {
      expect(
        meetsConditions(required, context({ flags: { a: buildFlag(), b: buildFlag() } })),
      ).toBe(true);
    });

    it("fails when one flag is missing", () => {
      expect(meetsConditions(required, context({ flags: { a: buildFlag() } }))).toBe(false);
    });
  });

  describe("anyFlags", () => {
    const anyOf = conditions({ anyFlags: ["a", "b"] });

    it("passes when at least one flag is active", () => {
      expect(meetsConditions(anyOf, context({ flags: { b: buildFlag() } }))).toBe(true);
    });

    it("fails when none of the flags is active", () => {
      expect(meetsConditions(anyOf, context())).toBe(false);
    });
  });

  describe("noneFlags", () => {
    const forbidden = conditions({ noneFlags: ["a"] });

    it("fails when a forbidden flag is active", () => {
      expect(meetsConditions(forbidden, context({ flags: { a: buildFlag() } }))).toBe(false);
    });

    it("passes when the forbidden flag is set to false", () => {
      expect(
        meetsConditions(forbidden, context({ flags: { a: buildFlag({ value: false }) } })),
      ).toBe(true);
    });
  });

  describe("meters", () => {
    const lowPeople = conditions({ meters: { people: { min: 0, max: 25 } } });

    it("includes both limits", () => {
      expect(meetsConditions(lowPeople, context({ meters: buildMeters({ people: 25 }) }))).toBe(
        true,
      );
      expect(meetsConditions(lowPeople, context({ meters: buildMeters({ people: 0 }) }))).toBe(
        true,
      );
    });

    it("fails outside the range", () => {
      expect(meetsConditions(lowPeople, context({ meters: buildMeters({ people: 26 }) }))).toBe(
        false,
      );
    });

    it("does not restrict pillars that are not listed", () => {
      const meters = buildMeters({ people: 10, market: 100 });
      expect(meetsConditions(lowPeople, context({ meters }))).toBe(true);
    });
  });

  describe("anyMeters", () => {
    const congressCritical = conditions({
      anyMeters: [
        { meter: "congress", min: 1, max: 18 },
        { meter: "congress", min: 82, max: 99 },
      ],
    });

    it("passes when any listed range matches", () => {
      expect(
        meetsConditions(congressCritical, context({ meters: buildMeters({ congress: 90 }) })),
      ).toBe(true);
    });

    it("fails when no listed range matches", () => {
      expect(meetsConditions(congressCritical, context())).toBe(false);
    });
  });
});
