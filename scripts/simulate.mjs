// Balance simulator (GDD §19.3). Usage: npm run simulate -- --games 2000 --policy center --json
import { loadContent } from "../src/content/index.js";
import { NoEligibleCardError } from "../src/errors/index.js";
import { POLICIES, simulateGame, summarizeSimulations } from "../src/simulation/index.js";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const games = Number.parseInt(option("games", "1000"), 10);
const policyOption = option("policy", "all");
const policyNames = policyOption === "all" ? Object.keys(POLICIES) : [policyOption];

for (const name of policyNames) {
  if (!Object.hasOwn(POLICIES, name)) {
    console.error(`Unknown policy "${name}". Available: ${Object.keys(POLICIES).join(", ")}, all`);
    process.exit(1);
  }
}

const { cards } = loadContent();
const reports = {};

for (const name of policyNames) {
  const results = [];
  let deadEnds = 0;

  for (let index = 0; index < games; index += 1) {
    try {
      results.push(simulateGame({ cards, policy: POLICIES[name], seed: `${name}-${index}` }));
    } catch (error) {
      if (!(error instanceof NoEligibleCardError)) throw error;
      deadEnds += 1;
    }
  }

  reports[name] = { ...summarizeSimulations(results), deadEnds };
}

if (args.includes("--json")) {
  console.log(JSON.stringify(reports, null, 2));
} else {
  const percent = (value) => `${(value * 100).toFixed(1)}%`;

  console.log(`\nDecretum balance simulation — ${games} games per policy\n`);
  console.table(
    Object.fromEntries(
      Object.entries(reports).map(([name, report]) => [
        name,
        {
          "avg months": report.averageMonths.toFixed(1),
          "median months": report.medianMonths,
          completed: percent(report.completionRate),
          "fallback selections": report.fallbackSelections,
          "dead ends": report.deadEnds,
        },
      ]),
    ),
  );

  console.log("Endings per policy:");
  console.table(
    Object.fromEntries(Object.entries(reports).map(([name, report]) => [name, report.endings])),
  );

  const overused = new Set();
  for (const report of Object.values(reports)) {
    for (const [slug, max] of Object.entries(report.maxAppearancesPerGame)) {
      if (max > 4) overused.add(`${slug} (${max}×)`);
    }
  }
  console.log(
    overused.size > 0
      ? `Cards shown more than 4 times in one government: ${[...overused].join(", ")}`
      : "No card was shown more than 4 times in one government.",
  );
}
