import { loadContent } from "@/src/content";
import { POLICIES, simulateGame, summarizeSimulations } from "@/src/simulation";

describe("simulated governments with the initial content", () => {
  const { cards } = loadContent();

  it.each(Object.keys(POLICIES))("always reach an ending with the %s policy", (policyName) => {
    const results = Array.from({ length: 40 }, (_, index) =>
      simulateGame({ cards, policy: POLICIES[policyName], seed: `sim-${policyName}-${index}` }),
    );

    for (const result of results) {
      expect(["ended", "completed"]).toContain(result.status);
      expect(result.months).toBeGreaterThanOrEqual(1);
      expect(result.months).toBeLessThanOrEqual(48);
    }
  });

  it("replays the same government for the same seed and policy", () => {
    const first = simulateGame({ cards, policy: POLICIES.random, seed: "replay" });
    const second = simulateGame({ cards, policy: POLICIES.random, seed: "replay" });

    expect(second).toEqual(first);
  });

  it("summarizes endings, durations and choices", () => {
    const results = Array.from({ length: 10 }, (_, index) =>
      simulateGame({ cards, policy: POLICIES.alternate, seed: `summary-${index}` }),
    );

    const summary = summarizeSimulations(results);

    expect(summary.games).toBe(10);
    expect(Object.values(summary.endings).reduce((sum, count) => sum + count, 0)).toBe(10);
    expect(summary.choices.left + summary.choices.right).toBe(
      results.reduce((sum, result) => sum + result.months, 0),
    );
  });
});
