import { createRng, createTurnRng } from "@/src/domain/rng";

function take(rng, count) {
  return Array.from({ length: count }, () => rng());
}

describe("createRng", () => {
  it("produces the same sequence for the same seed", () => {
    expect(take(createRng("auroria"), 5)).toEqual(take(createRng("auroria"), 5));
  });

  it("produces different sequences for different seeds", () => {
    expect(take(createRng("auroria"), 5)).not.toEqual(take(createRng("carta"), 5));
  });

  it("returns values in the [0, 1) interval", () => {
    const values = take(createRng("interval"), 1000);

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});

describe("createTurnRng", () => {
  it("is deterministic for the same seed and turn", () => {
    expect(take(createTurnRng("seed", 7), 3)).toEqual(take(createTurnRng("seed", 7), 3));
  });

  it("differs between turns of the same government", () => {
    expect(take(createTurnRng("seed", 7), 3)).not.toEqual(take(createTurnRng("seed", 8), 3));
  });
});
