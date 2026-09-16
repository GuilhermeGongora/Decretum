import { applyFlagOperations, expireFlags, isFlagActive } from "@/src/domain/flags";
import { buildFlag, buildFlagDefinition } from "./fixtures";

describe("isFlagActive", () => {
  it("is true for a flag with a truthy value", () => {
    expect(isFlagActive({ reform: buildFlag() }, "reform")).toBe(true);
  });

  it("is true for a flag with a string value", () => {
    expect(isFlagActive({ mood: buildFlag({ value: "tense" }) }, "mood")).toBe(true);
  });

  it("is false for a missing flag", () => {
    expect(isFlagActive({}, "reform")).toBe(false);
  });

  it("is false for a flag explicitly set to false", () => {
    expect(isFlagActive({ reform: buildFlag({ value: false }) }, "reform")).toBe(false);
  });
});

describe("applyFlagOperations", () => {
  const strike = buildFlagDefinition({
    key: "teachers_strike_active",
    expiresAfterTurns: 8,
    label: "Greve em curso",
  });

  it("creates a flag with its catalog metadata and expiration turn", () => {
    const { flags, changes } = applyFlagOperations({}, { setFlags: [strike] }, 4);

    expect(flags.teachers_strike_active).toEqual({
      value: true,
      label: "Greve em curso",
      legacy: false,
      legacyPriority: 0,
      successorEffects: null,
      setAtTurn: 4,
      expiresAtTurn: 12,
      inherited: false,
    });
    expect(changes).toEqual([
      {
        type: "set",
        key: "teachers_strike_active",
        value: true,
        previousValue: null,
        expiresAtTurn: 12,
        legacy: false,
        label: "Greve em curso",
      },
    ]);
  });

  it("creates permanent legacy flags without an expiration turn", () => {
    const reform = buildFlagDefinition({
      key: "tax_reform_approved",
      legacy: true,
      legacyPriority: 50,
      successorEffects: { people: 1, market: 4, congress: -3, institutions: 2 },
    });

    const { flags } = applyFlagOperations({}, { setFlags: [reform] }, 10);

    expect(flags.tax_reform_approved).toMatchObject({
      legacy: true,
      legacyPriority: 50,
      expiresAtTurn: null,
      successorEffects: { people: 1, market: 4, congress: -3, institutions: 2 },
    });
  });

  it("overwrites an existing flag and reports the previous value", () => {
    const current = { mood: buildFlag({ value: "calm" }) };

    const { flags, changes } = applyFlagOperations(
      current,
      { setFlags: [buildFlagDefinition({ key: "mood", value: "tense" })] },
      7,
    );

    expect(flags.mood.value).toBe("tense");
    expect(changes[0]).toMatchObject({ type: "set", key: "mood", previousValue: "calm" });
  });

  it("removes an existing flag", () => {
    const { flags, changes } = applyFlagOperations(
      { strike: buildFlag({ label: "Greve" }) },
      { removeFlags: ["strike"] },
      7,
    );

    expect(flags).toEqual({});
    expect(changes).toEqual([
      { type: "removed", key: "strike", previousValue: true, label: "Greve" },
    ]);
  });

  it("ignores the removal of a flag that is not set", () => {
    expect(applyFlagOperations({}, { removeFlags: ["strike"] }, 7)).toEqual({
      flags: {},
      changes: [],
    });
  });

  it("applies removals before sets", () => {
    const { flags } = applyFlagOperations(
      { strike: buildFlag() },
      { removeFlags: ["strike"], setFlags: [buildFlagDefinition({ key: "strike" })] },
      7,
    );

    expect(flags.strike).toMatchObject({ value: true, setAtTurn: 7 });
  });

  it("does not mutate the current flags", () => {
    const current = { strike: buildFlag() };

    applyFlagOperations(current, { removeFlags: ["strike"] }, 7);

    expect(current.strike).toBeDefined();
  });
});

describe("expireFlags", () => {
  const flags = { strike: buildFlag({ expiresAtTurn: 10 }), reform: buildFlag() };

  it("keeps a flag active while resolving the turn before its expiration", () => {
    expect(expireFlags(flags, 9)).toEqual({ flags, expired: [] });
  });

  it("removes the flag before the card of its expiration turn is selected", () => {
    expect(expireFlags(flags, 10)).toEqual({
      flags: { reform: flags.reform },
      expired: ["strike"],
    });
  });

  it("never expires permanent flags", () => {
    expect(expireFlags(flags, 48).flags.reform).toBeDefined();
  });
});
