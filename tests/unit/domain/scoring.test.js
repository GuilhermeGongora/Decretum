import { calculateMonthStability, calculateScore, chooseEpithet } from "@/src/domain/scoring";
import { buildMeters } from "./fixtures";

function repeat(meters, count) {
  return Array.from({ length: count }, () => meters);
}

describe("calculateMonthStability", () => {
  it("is 100 when every pillar is at 50", () => {
    expect(calculateMonthStability(buildMeters())).toBe(100);
  });

  it("averages the stability of the four pillars", () => {
    expect(calculateMonthStability(buildMeters({ people: 0, market: 100 }))).toBe(50);
    expect(calculateMonthStability(buildMeters({ people: 25, market: 75 }))).toBe(75);
  });
});

describe("calculateScore", () => {
  it("gives 9300 points to a completed and perfectly balanced mandate", () => {
    expect(
      calculateScore({
        meterSnapshots: repeat(buildMeters(), 48),
        monthsSurvived: 48,
        mandateCompleted: true,
      }),
    ).toEqual({
      survivalScore: 4800,
      completionBonus: 2500,
      averageStability: 100,
      balanceBonus: 2000,
      score: 9300,
    });
  });

  it("scores a government that fell in its first month", () => {
    const result = calculateScore({
      meterSnapshots: [buildMeters({ people: 0 })],
      monthsSurvived: 1,
      mandateCompleted: false,
    });

    expect(result).toMatchObject({ survivalScore: 100, completionBonus: 0, balanceBonus: 1500 });
    expect(result.score).toBe(1600);
  });

  it("rounds the balance bonus", () => {
    const result = calculateScore({
      meterSnapshots: [buildMeters(), buildMeters(), buildMeters({ people: 49 })],
      monthsSurvived: 3,
      mandateCompleted: false,
    });

    expect(result.balanceBonus).toBe(1997);
  });
});

describe("chooseEpithet", () => {
  it("names a completed mandate with average stability of 75 or more O Equilibrista", () => {
    const meterSnapshots = repeat(buildMeters({ people: 25, market: 75 }), 48);

    expect(chooseEpithet({ meterSnapshots, monthsSurvived: 48, mandateCompleted: true })).toBe(
      "equilibrist",
    );
  });

  it("uses the dominant pillar when a completed mandate is below 75 stability", () => {
    const meterSnapshots = repeat(buildMeters({ people: 24, market: 76 }), 48);

    expect(chooseEpithet({ meterSnapshots, monthsSurvived: 48, mandateCompleted: true })).toBe(
      "economy_guarantor",
    );
  });

  it("names a government that ended before month 12 O Governo Breve", () => {
    const meterSnapshots = repeat(buildMeters({ people: 60 }), 11);

    expect(chooseEpithet({ meterSnapshots, monthsSurvived: 11, mandateCompleted: false })).toBe(
      "brief_government",
    );
    expect(
      chooseEpithet({
        meterSnapshots: repeat(buildMeters({ people: 60 }), 12),
        monthsSurvived: 12,
        mandateCompleted: false,
      }),
    ).toBe("voice_of_the_streets");
  });

  it("names a government that reached month 36 without completing O Sobrevivente", () => {
    const meterSnapshots = repeat(buildMeters({ market: 60 }), 36);

    expect(chooseEpithet({ meterSnapshots, monthsSurvived: 36, mandateCompleted: false })).toBe(
      "survivor",
    );
  });

  it.each([
    ["people", "voice_of_the_streets"],
    ["market", "economy_guarantor"],
    ["congress", "coalition_master"],
    ["institutions", "charter_guardian"],
  ])("names the government after the highest average pillar (%s)", (meter, code) => {
    const meterSnapshots = repeat(buildMeters({ [meter]: 60 }), 20);

    expect(chooseEpithet({ meterSnapshots, monthsSurvived: 20, mandateCompleted: false })).toBe(
      code,
    );
  });

  it("breaks ties between pillars with institutions, people, congress and market precedence", () => {
    const meterSnapshots = repeat(buildMeters({ people: 60, congress: 60 }), 20);

    expect(chooseEpithet({ meterSnapshots, monthsSurvived: 20, mandateCompleted: false })).toBe(
      "voice_of_the_streets",
    );
  });
});
