import { brazil } from "@/src/content/countries/brazil";
import { toProcedureChronicleView } from "@/src/services/gameViews";

// The archive keeps what happened, when it happened. These entries are built from the record the
// engine wrote at the time, so re-reading the chronicle never rewrites it.
const procedure = (over = {}) => ({
  type: "impeachment",
  countryCode: "BR",
  stage: "senate_trial",
  status: "active",
  grounds: "audit_cover_up",
  evidence: 70,
  support: {
    chamber: 62,
    senate: 58,
    coalitionCohesion: 40,
    publicPressure: 65,
    institutionalCredibility: 45,
  },
  chamberVotes: 361,
  senateVotes: null,
  openedAtTurn: 12,
  deadlineTurn: null,
  resolution: null,
  resolvedAtTurn: null,
  timeline: [
    { turn: 12, stage: "grounds_emerging", note: "Obstrução de auditoria" },
    { turn: 16, stage: "chamber_vote", note: "Câmara: 361 votos" },
    { turn: 17, stage: "senate_admissibility", note: "Senado: 46 votos pela instauração" },
  ],
  ...over,
});

describe("the constitutional milestones in the archive", () => {
  it("has nothing to record for a government that faced no procedure", () => {
    expect(toProcedureChronicleView(null, brazil)).toEqual([]);
  });

  it("has nothing to record for a country with no removal procedure", () => {
    expect(toProcedureChronicleView(procedure(), { countryCode: "XX" })).toEqual([]);
  });

  it("keeps one entry per step, in the order the engine wrote them", () => {
    const entries = toProcedureChronicleView(procedure(), brazil);

    expect(entries).toHaveLength(3);
    expect(entries.map((entry) => entry.turn)).toEqual([12, 16, 17]);
  });

  it("dates each milestone on the month it happened", () => {
    const [first] = toProcedureChronicleView(procedure(), brazil);

    expect(first.turn).toBe(12);
    expect(first.calendar).toEqual({ year: 1, monthIndex: 11 });
  });

  it("names each step in the words of the country", () => {
    const entries = toProcedureChronicleView(procedure(), brazil);

    expect(entries[1].label).toBe("Votação na Câmara");
    expect(entries[2].label).toBe("Instauração no Senado");
  });

  it("names the resolution when the process ended", () => {
    const [entry] = toProcedureChronicleView(
      procedure({
        timeline: [{ turn: 20, stage: "archived", note: null }],
      }),
      brazil,
    );

    expect(entry.label).toBe("Pedido arquivado");
  });

  it("says which house held each step", () => {
    const entries = toProcedureChronicleView(procedure(), brazil);

    expect(entries[1].institution).toBe("Câmara dos Deputados");
    expect(entries[2].institution).toBe("Senado Federal");
  });

  it("keeps the note the engine recorded, and accepts none", () => {
    const entries = toProcedureChronicleView(
      procedure({
        timeline: [
          { turn: 16, stage: "chamber_vote", note: "Câmara: 361 votos" },
          { turn: 18, stage: "suspended", note: null },
        ],
      }),
      brazil,
    );

    expect(entries[0].note).toBe("Câmara: 361 votos");
    expect(entries[1].note).toBeNull();
  });

  it("gives every entry an identity of its own", () => {
    const entries = toProcedureChronicleView(procedure(), brazil);
    const ids = entries.map((entry) => entry.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never carries a number the outcome was computed from", () => {
    const text = JSON.stringify(toProcedureChronicleView(procedure(), brazil));

    for (const internal of [
      "support",
      "coalitionCohesion",
      "institutionalCredibility",
      "evidence",
    ]) {
      expect(text).not.toContain(internal);
    }
  });
});
