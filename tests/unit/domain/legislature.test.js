import { DRIVERS, adherence, apportion, countVotes, projectVotes } from "@/src/domain/legislature";

// A synthetic parliament. The model must hold for any country, so nothing here is Brazilian: no 513,
// no 342, no 81. Those numbers belong to the country pack and are exercised elsewhere.
const HOUSE = {
  seats: 200,
  blocs: [
    { key: "loyal", share: 0.25, intercept: -4.5, weights: { cohesionLoss: 2, evidence: 2 } },
    {
      key: "pragmatic",
      share: 0.3,
      intercept: -3,
      weights: { cohesionLoss: 3, evidence: 3, hostility: 1 },
    },
    { key: "centre", share: 0.25, intercept: -2, weights: { evidence: 4, publicPressure: 2 } },
    { key: "opposition", share: 0.2, intercept: 1, weights: { evidence: 2 } },
  ],
};

const CALM = {
  evidence: 0,
  publicPressure: 0,
  hostility: 0,
  cohesionLoss: 0,
  credibilityLoss: 0,
};
const STORM = {
  evidence: 1,
  publicPressure: 1,
  hostility: 1,
  cohesionLoss: 1,
  credibilityLoss: 1,
};
const drivers = (over) => ({ ...CALM, ...over });

describe("dividing a house into blocs", () => {
  it("hands out every seat, and never invents one", () => {
    for (const seats of [3, 81, 100, 200, 513, 999]) {
      const seated = apportion(seats, HOUSE.blocs);
      const total = seated.reduce((sum, bloc) => sum + bloc.seats, 0);

      expect(total).toBe(seats);
    }
  });

  it("keeps the order and the names of the blocs the country declared", () => {
    const seated = apportion(513, HOUSE.blocs);

    expect(seated.map((bloc) => bloc.key)).toEqual(["loyal", "pragmatic", "centre", "opposition"]);
  });

  it("gives each bloc at least the seats its share earns outright", () => {
    const seated = apportion(513, HOUSE.blocs);

    for (const [index, bloc] of seated.entries()) {
      expect(bloc.seats).toBeGreaterThanOrEqual(Math.floor(513 * HOUSE.blocs[index].share));
    }
  });

  it("divides a house that does not split evenly without losing the remainder", () => {
    const seated = apportion(7, HOUSE.blocs);

    expect(seated.reduce((sum, bloc) => sum + bloc.seats, 0)).toBe(7);
  });
});

describe("how a bloc responds", () => {
  const centre = HOUSE.blocs[2];

  it("stays where it rests when nothing is happening", () => {
    // intercept -2 alone: a little under 12%.
    expect(adherence(centre, CALM)).toBeLessThan(0.2);
  });

  it("moves further the more the drivers it cares about grow", () => {
    const steps = [0, 0.25, 0.5, 0.75, 1].map((evidence) =>
      adherence(centre, drivers({ evidence })),
    );

    for (let i = 1; i < steps.length; i += 1) {
      expect(steps[i]).toBeGreaterThan(steps[i - 1]);
    }
  });

  it("pays more for each step as it runs out of members to convince", () => {
    const at = (evidence) => adherence(centre, drivers({ evidence }));
    const early = at(0.5) - at(0.25);
    const late = at(1) - at(0.75);

    // Diminishing returns: the same increment buys less near the top than in the middle.
    expect(late).toBeLessThan(early);
  });

  it("ignores a driver it puts no weight on", () => {
    const withPressure = adherence(HOUSE.blocs[0], drivers({ publicPressure: 1 }));
    const without = adherence(HOUSE.blocs[0], CALM);

    expect(withPressure).toBe(without);
  });

  it("ignores a weight that names something the engine does not know", () => {
    const invented = { ...HOUSE.blocs[2], weights: { ...centre.weights, astrology: 9 } };

    expect(adherence(invented, STORM)).toBe(adherence(centre, STORM));
    expect(DRIVERS).not.toContain("astrology");
  });

  it("never leaves the range a share of a bloc can occupy", () => {
    for (const bloc of HOUSE.blocs) {
      expect(adherence(bloc, CALM)).toBeGreaterThan(0);
      expect(adherence(bloc, STORM)).toBeLessThan(1);
    }
  });
});

describe("counting a house", () => {
  it("returns the same count for the same house every time", () => {
    const once = countVotes(HOUSE, drivers({ evidence: 0.6, publicPressure: 0.4 }));
    const twice = countVotes(HOUSE, drivers({ evidence: 0.6, publicPressure: 0.4 }));

    expect(once.votes).toBe(twice.votes);
    expect(once.byBloc).toEqual(twice.byBloc);
  });

  it("never counts more votes than there are seats, or fewer than none", () => {
    expect(countVotes(HOUSE, STORM).votes).toBeLessThanOrEqual(HOUSE.seats);
    expect(countVotes(HOUSE, CALM).votes).toBeGreaterThanOrEqual(0);
  });

  it("never counts a bloc above its own seats", () => {
    const { byBloc } = countVotes(HOUSE, STORM);

    for (const bloc of byBloc) {
      expect(bloc.votes).toBeLessThanOrEqual(bloc.seats);
    }
  });

  it("leaves a loyal bloc holding part of the house even under everything at once", () => {
    // This is what makes a near-unanimous parliament impossible: a bloc that rests far below its
    // tipping point cannot be carried there by pressure, however much of it arrives.
    const { votes, byBloc } = countVotes(HOUSE, STORM);
    const loyal = byBloc.find((bloc) => bloc.key === "loyal");

    expect(loyal.adherence).toBeLessThan(0.6);
    expect(votes / HOUSE.seats).toBeLessThan(0.95);
  });

  it("counts almost nobody when nothing has happened", () => {
    const { votes } = countVotes(HOUSE, CALM);

    expect(votes / HOUSE.seats).toBeLessThan(0.3);
  });

  it("grows with the accusation, not with hostility alone", () => {
    const hostileOnly = countVotes(HOUSE, drivers({ hostility: 1 })).votes;
    const evidenced = countVotes(HOUSE, drivers({ evidence: 1 })).votes;

    expect(evidenced).toBeGreaterThan(hostileOnly);
  });
});

describe("the projection given to the public", () => {
  it("always contains the count it was built from", () => {
    for (const votes of [0, 41, 200, 341, 342, 513]) {
      const band = projectVotes(votes, 513);

      expect(band.min).toBeLessThanOrEqual(votes);
      expect(band.max).toBeGreaterThanOrEqual(votes);
    }
  });

  it("never reaches outside the house", () => {
    expect(projectVotes(2, 81).min).toBe(0);
    expect(projectVotes(80, 81).max).toBe(81);
  });

  it("stays wide enough to leave the vote in doubt", () => {
    const band = projectVotes(340, 513);

    expect(band.max - band.min).toBeGreaterThanOrEqual(8);
  });
});
