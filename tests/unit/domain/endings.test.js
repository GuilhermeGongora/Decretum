import { applyDeltas } from "@/src/domain/effects";
import { evaluateCollapse } from "@/src/domain/endings";
import { buildMeters } from "./fixtures";

function collapseAfter(start, deltas) {
  const neutral = { people: 0, market: 0, congress: 0, institutions: 0 };
  return evaluateCollapse(applyDeltas(buildMeters(start), { ...neutral, ...deltas }));
}

describe("evaluateCollapse", () => {
  it("returns null while every pillar stays between 1 and 99", () => {
    expect(collapseAfter({ people: 2, market: 98 }, { people: -1, market: 1 })).toBeNull();
  });

  it.each([
    ["people", 5, -5, "people_abandoned"],
    ["people", 95, 5, "people_dominant"],
    ["market", 5, -5, "market_collapsed"],
    ["market", 95, 5, "market_dominant"],
    ["congress", 5, -5, "congress_isolated"],
    ["congress", 95, 5, "congress_dominant"],
    ["institutions", 5, -5, "institutions_broken"],
    ["institutions", 95, 5, "institutions_dominant"],
  ])("ends the government when %s goes from %i by %i (%s)", (meter, start, delta, code) => {
    const result = collapseAfter({ [meter]: start }, { [meter]: delta });

    expect(result.primary).toMatchObject({ meter, endingCode: code });
    expect(result.simultaneous).toEqual([]);
  });

  describe("when several pillars reach an extreme in the same decision", () => {
    it("picks the largest normalized excess as the primary ending", () => {
      const result = collapseAfter({ people: 2, market: 97 }, { people: -5, market: 7 });

      expect(result.primary).toEqual({ meter: "market", endingCode: "market_dominant", excess: 4 });
      expect(result.simultaneous).toEqual([
        { meter: "people", endingCode: "people_abandoned", excess: 3 },
      ]);
    });

    it("breaks equal excess with institutions, people, congress and market precedence", () => {
      const result = collapseAfter(
        { people: 3, market: 3, congress: 97, institutions: 97 },
        { people: -5, market: -5, congress: 5, institutions: 5 },
      );

      expect(result.primary.endingCode).toBe("institutions_dominant");
      expect(result.simultaneous.map((crisis) => crisis.endingCode)).toEqual([
        "people_abandoned",
        "congress_dominant",
        "market_collapsed",
      ]);
    });
  });
});
