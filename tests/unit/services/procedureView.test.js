import { brazil } from "@/src/content/countries/brazil";
import { toProcedureView } from "@/src/services/gameViews";

// What the server is allowed to say about a constitutional procedure. Everything the outcome is
// computed from — the drive in each house, the cohesion of the coalition, the weight of the file —
// stays behind: a player who could read those numbers would be reading the result early.
const INTERNALS = [
  "support",
  "coalitionCohesion",
  "institutionalCredibility",
  "publicPressure",
  "hostility",
  "byBloc",
  "adherence",
  "intercept",
];

function procedureAt(stage, over = {}) {
  return {
    type: "impeachment",
    countryCode: "BR",
    stage,
    status: "active",
    grounds: "audit_cover_up",
    evidence: 70,
    support: {
      chamber: 62,
      senate: 55,
      coalitionCohesion: 40,
      publicPressure: 65,
      institutionalCredibility: 45,
    },
    chamberVotes: null,
    senateVotes: null,
    openedAtTurn: 12,
    deadlineTurn: null,
    resolution: null,
    resolvedAtTurn: null,
    timeline: [{ turn: 12, stage: "grounds_emerging", note: "Obstrução de auditoria" }],
    ...over,
  };
}

const serialised = (view) => JSON.stringify(view);

describe("what the server says about a procedure", () => {
  it("says nothing at all when there is no procedure", () => {
    expect(toProcedureView(null, brazil)).toBeNull();
  });

  it("says nothing for a country that has no removal procedure", () => {
    expect(toProcedureView(procedureAt("chamber_vote"), { countryCode: "XX" })).toBeNull();
  });

  it("names the stage and the house that decides it, in the country's own words", () => {
    const chamber = toProcedureView(procedureAt("chamber_vote"), brazil);
    const senate = toProcedureView(procedureAt("senate_trial"), brazil);

    expect(chamber.stage).toMatchObject({ key: "chamber_vote", label: "Votação na Câmara" });
    expect(chamber.institution).toBe("Câmara dos Deputados");
    expect(senate.institution).toBe("Senado Federal");
  });

  it("points at the next milestone without promising how it ends", () => {
    const view = toProcedureView(procedureAt("chamber_campaign"), brazil);

    expect(view.nextMilestone).toMatchObject({ key: "chamber_vote" });
    expect(view.resolution).toBeNull();
  });

  it("has no next milestone once the process is over", () => {
    const view = toProcedureView(
      procedureAt("archived", { status: "resolved", resolution: "archived" }),
      brazil,
    );

    expect(view.nextMilestone).toBeNull();
    expect(view.resolutionLabel).toBe("Pedido arquivado");
  });

  it("describes the accusation in words, never as the number it is weighed with", () => {
    const weak = toProcedureView(procedureAt("chamber_vote", { evidence: 20 }), brazil);
    const relevant = toProcedureView(procedureAt("chamber_vote", { evidence: 50 }), brazil);
    const grave = toProcedureView(procedureAt("chamber_vote", { evidence: 90 }), brazil);

    expect(weak.accusation.level.label).toBe("frágeis");
    expect(relevant.accusation.level.label).toBe("relevantes");
    expect(grave.accusation.level.label).toBe("graves");
    expect(serialised(grave)).not.toContain("90");
  });

  it("names the grounds the process was opened on", () => {
    const view = toProcedureView(procedureAt("chamber_vote"), brazil);

    expect(view.accusation.grounds).toEqual([
      { key: "audit_cover_up", label: "Obstrução de auditoria" },
    ]);
  });

  it("separates where the presidency stands from where the process stands", () => {
    const running = toProcedureView(procedureAt("chamber_vote"), brazil);
    const suspended = toProcedureView(procedureAt("suspended"), brazil);
    const removed = toProcedureView(
      procedureAt("removed", { status: "resolved", resolution: "removed" }),
      brazil,
    );
    const acquitted = toProcedureView(
      procedureAt("acquitted", { status: "resolved", resolution: "acquitted" }),
      brazil,
    );

    expect(running.presidency.key).toBe("in_office");
    expect(suspended.presidency.key).toBe("suspended");
    expect(removed.presidency.key).toBe("removed");
    expect(acquitted.presidency.key).toBe("restored");
  });

  it("gives a band before a house votes and the confirmed count after it", () => {
    const before = toProcedureView(procedureAt("chamber_vote"), brazil);
    const after = toProcedureView(
      procedureAt("senate_admissibility", { chamberVotes: 361 }),
      brazil,
    );

    expect(before.chamber.votes).toBeNull();
    expect(before.chamber.estimate.high).toBeGreaterThan(before.chamber.estimate.low);
    expect(after.chamber.votes).toBe(361);
    expect(after.chamber.estimate).toBeNull();
  });

  it("counts the suspension down from the month the government is living", () => {
    const suspended = procedureAt("suspended", { openedAtTurn: 14, deadlineTurn: 26 });

    // Six months into a suspension that ends at 26, four are left — not the twelve that separate
    // the deadline from the day the process was opened.
    expect(toProcedureView(suspended, brazil, 22).turnsLeft).toBe(4);
    expect(toProcedureView(suspended, brazil, 25).turnsLeft).toBe(1);
  });

  it("never counts the suspension below zero, or past the limit the country sets", () => {
    const suspended = procedureAt("suspended", { openedAtTurn: 14, deadlineTurn: 26 });

    expect(toProcedureView(suspended, brazil, 27).turnsLeft).toBe(0);
    expect(toProcedureView(suspended, brazil, 20).turnsLeft).toBeLessThanOrEqual(
      brazil.removal.suspensionTurns,
    );
  });

  it("gives no deadline at all when the month is not known", () => {
    const suspended = procedureAt("suspended", { openedAtTurn: 14, deadlineTurn: 26 });

    expect(toProcedureView(suspended, brazil).turnsLeft).toBeNull();
  });

  it("gives no deadline for a stage that has none", () => {
    expect(toProcedureView(procedureAt("chamber_vote"), brazil, 15).turnsLeft).toBeNull();
  });

  it("carries the quorum of each house from the country, never from the interface", () => {
    const view = toProcedureView(procedureAt("chamber_vote"), brazil);

    expect(view.chamber).toMatchObject({ seats: 513, threshold: 342 });
    expect(view.senate.seats).toBe(81);
  });

  it("asks the Senate for an absolute majority to open and two thirds to convict", () => {
    const opening = toProcedureView(procedureAt("senate_admissibility"), brazil);
    const trial = toProcedureView(procedureAt("senate_trial"), brazil);

    expect(opening.senate.threshold).toBe(41);
    expect(trial.senate.threshold).toBe(54);
  });

  it("never leaks a single number the outcome is computed from", () => {
    for (const stage of ["grounds_emerging", "chamber_vote", "suspended", "senate_trial"]) {
      const text = serialised(toProcedureView(procedureAt(stage), brazil));

      for (const internal of INTERNALS) {
        expect(text).not.toContain(internal);
      }
    }
  });

  it("keeps the timeline it was given, without rewriting it", () => {
    const view = toProcedureView(procedureAt("chamber_vote"), brazil);

    expect(view.timeline).toEqual([
      expect.objectContaining({ turn: 12, stage: "grounds_emerging" }),
    ]);
  });
});
