import { clampMeter, createInitialMeters, getMeterBand, getTrend } from "@/src/domain/meters";

describe("createInitialMeters", () => {
  it("starts every pillar at 50", () => {
    expect(createInitialMeters()).toEqual({
      people: 50,
      market: 50,
      congress: 50,
      institutions: 50,
    });
  });
});

describe("clampMeter", () => {
  it.each([
    [-5, 0],
    [0, 0],
    [57, 57],
    [100, 100],
    [130, 100],
  ])("limits %i to %i", (value, expected) => {
    expect(clampMeter(value)).toBe(expected);
  });
});

describe("getMeterBand", () => {
  it.each([
    [0, "collapsed_low"],
    [1, "critical_low"],
    [14, "critical_low"],
    [15, "unstable_low"],
    [29, "unstable_low"],
    [30, "governable"],
    [70, "governable"],
    [71, "unstable_high"],
    [85, "unstable_high"],
    [86, "critical_high"],
    [99, "critical_high"],
    [100, "collapsed_high"],
  ])("classifies %i as %s", (value, band) => {
    expect(getMeterBand(value)).toBe(band);
  });
});

describe("getTrend", () => {
  it.each([
    [0, { direction: "none", strength: 0 }],
    [1, { direction: "up", strength: 1 }],
    [3, { direction: "up", strength: 1 }],
    [4, { direction: "up", strength: 2 }],
    [7, { direction: "up", strength: 2 }],
    [8, { direction: "up", strength: 3 }],
    [15, { direction: "up", strength: 3 }],
    [-2, { direction: "down", strength: 1 }],
    [-6, { direction: "down", strength: 2 }],
    [-9, { direction: "down", strength: 3 }],
  ])("shows delta %i as %o", (delta, expected) => {
    expect(getTrend(delta)).toEqual(expected);
  });
});
