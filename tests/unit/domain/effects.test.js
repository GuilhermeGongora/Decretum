import { applyDeltas, resolveChoiceDeltas } from "@/src/domain/effects";
import { buildChoice, buildMeters } from "./fixtures";

describe("resolveChoiceDeltas", () => {
  it("returns the fixed delta of every pillar", () => {
    const choice = buildChoice({ effects: { people: 7, market: -4, congress: -2 } });

    expect(resolveChoiceDeltas(choice, buildMeters())).toEqual({
      people: 7,
      market: -4,
      congress: -2,
      institutions: 0,
    });
  });

  describe("toward_center", () => {
    const choice = buildChoice({
      conditionalEffects: [{ type: "toward_center", meter: "congress", amount: 10 }],
    });

    it("adds the amount when the pillar is below 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters({ congress: 12 })).congress).toBe(10);
    });

    it("subtracts the amount when the pillar is above 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters({ congress: 90 })).congress).toBe(-10);
    });

    it("has no effect when the pillar is exactly 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters()).congress).toBe(0);
    });
  });

  describe("away_from_center", () => {
    const choice = buildChoice({
      conditionalEffects: [{ type: "away_from_center", meter: "market", amount: 4 }],
    });

    it("subtracts the amount when the pillar is below 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters({ market: 10 })).market).toBe(-4);
    });

    it("adds the amount when the pillar is above 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters({ market: 88 })).market).toBe(4);
    });

    it("has no effect when the pillar is exactly 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters()).market).toBe(0);
    });
  });

  describe("by_side", () => {
    const choice = buildChoice({
      conditionalEffects: [{ type: "by_side", meter: "people", below: 8, above: 4 }],
    });

    it("uses the below value when the pillar is below 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters({ people: 10 })).people).toBe(8);
    });

    it("uses the above value when the pillar is above 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters({ people: 90 })).people).toBe(4);
    });

    it("has no effect when the pillar is exactly 50", () => {
      expect(resolveChoiceDeltas(choice, buildMeters()).people).toBe(0);
    });
  });

  it("combines conditional operations with the fixed deltas of other pillars", () => {
    const choice = buildChoice({
      effects: { people: -2, institutions: -3 },
      conditionalEffects: [{ type: "toward_center", meter: "congress", amount: 10 }],
    });

    expect(resolveChoiceDeltas(choice, buildMeters({ congress: 10 }))).toEqual({
      people: -2,
      market: 0,
      congress: 10,
      institutions: -3,
    });
  });

  it("rejects operation types that are not part of the engine", () => {
    const choice = buildChoice({
      conditionalEffects: [{ type: "formula", meter: "people", amount: 1 }],
    });

    expect(() => resolveChoiceDeltas(choice, buildMeters())).toThrow(TypeError);
  });
});

describe("applyDeltas", () => {
  it("applies every delta to the same starting values", () => {
    const result = applyDeltas(buildMeters(), {
      people: 6,
      market: -4,
      congress: 0,
      institutions: 1,
    });

    const expected = { people: 56, market: 46, congress: 50, institutions: 51 };
    expect(result).toEqual({ raw: expected, meters: expected });
  });

  it("limits results to 0–100 while keeping the raw values", () => {
    const result = applyDeltas(buildMeters({ people: 3, market: 97 }), {
      people: -8,
      market: 9,
      congress: 0,
      institutions: 0,
    });

    expect(result.raw).toEqual({ people: -5, market: 106, congress: 50, institutions: 50 });
    expect(result.meters).toEqual({ people: 0, market: 100, congress: 50, institutions: 50 });
  });
});
