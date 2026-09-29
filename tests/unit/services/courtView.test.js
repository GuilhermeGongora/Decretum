import { countries } from "@/src/content/countries";
import { courtRuling } from "@/src/domain/court";
import { toCourtRulingView } from "@/src/services/gameViews";

const brazil = countries.BR;

// A real ruling from the engine, never a hand-built object: the view has to survive what the court
// actually produces.
const ruling = (flags, meters) =>
  courtRuling({
    country: brazil,
    flags: Object.fromEntries(flags.map((key) => [key, { value: true }])),
    meters: { people: 50, market: 50, congress: 50, institutions: 50, ...meters },
  });

const against = ruling(["documents_withheld", "press_intimidated"], {
  institutions: 10,
  people: 20,
});
const dismissed = ruling(["national_data_registry"], { institutions: 80, people: 80 });

// Everything that would tell the player where the votes were hiding, wherever it is nested.
const SECRET_KEYS = [
  "byBloc",
  "adherence",
  "intercept",
  "weights",
  "blocs",
  "share",
  "weight",
  "effects",
  "setFlags",
  "ruledFlag",
];

function secretsIn(value, path = "root") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => secretsIn(item, `${path}[${index}]`));
  }
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    SECRET_KEYS.includes(key) ? [`${path}.${key}`] : secretsIn(item, `${path}.${key}`),
  );
}

describe("the ruling a country publishes", () => {
  it("names the matter and the court that decided it", () => {
    const published = toCourtRulingView(against, brazil);

    expect(published).toMatchObject({
      matterKey: "records_withheld",
      matter: "Recusa de entregar documentos ao Tribunal",
      courtName: "Supremo Tribunal Federal",
      courtShortName: "STF",
    });
  });

  it("gives the score in plain numbers, against the bench and the majority it needed", () => {
    const published = toCourtRulingView(against, brazil);

    expect(published).toMatchObject({ seats: 11, majority: 6, votes: 7, upheld: true });
  });

  it("says in words that the government lost", () => {
    const published = toCourtRulingView(against, brazil);

    expect(published.summary).toBe(
      "O STF decidiu contra o governo: Recusa de entregar documentos ao Tribunal. Placar: 7 a 4.",
    );
  });

  it("says in words that the government was spared, without hiding that it was judged", () => {
    const published = toCourtRulingView(dismissed, brazil);

    expect(dismissed.upheld).toBe(false);
    expect(published.upheld).toBe(false);
    expect(published.summary).toMatch(/não acolheu o caso/);
    expect(published.matter).toBe("Limites do cadastro nacional de dados");
  });

  // The rule this view exists for: a bench is not a whip count.
  it("never publishes where the votes were hiding", () => {
    expect(secretsIn(toCourtRulingView(against, brazil))).toEqual([]);
    // The same search over the engine's own ruling finds them, so the check above means something.
    expect(secretsIn(against).length).toBeGreaterThan(0);
  });

  it("has nothing to publish on a month with no ruling", () => {
    expect(toCourtRulingView(null, brazil)).toBeNull();
  });

  it("has nothing to publish for a country that declares no court", () => {
    expect(toCourtRulingView(against, countries.US)).toBeNull();
  });
});
