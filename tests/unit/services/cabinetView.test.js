import { countries } from "@/src/content/countries";
import { createCabinet, findSeat } from "@/src/domain/cabinet";
import { toCabinetView } from "@/src/services/gameViews";

const brazil = countries.BR;

function view(overrides = {}) {
  return toCabinetView(createCabinet(brazil), brazil, {
    turn: 1,
    actionsUsed: 0,
    suspended: false,
    active: true,
    ...overrides,
  });
}

// Every place the word "loyalty" appears in the published view, wherever it is nested. A number here
// is the whole failure: the Presidency is told how safe a minister feels, never the score.
function loyaltiesIn(value) {
  if (Array.isArray(value)) return value.flatMap(loyaltiesIn);
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    key === "loyalty" ? [item] : loyaltiesIn(item),
  );
}

describe("the cabinet a government publishes", () => {
  it("names each ministry the way the ministry signs a document", () => {
    const seat = view().seats.find((entry) => entry.ministryKey === "fazenda");

    expect(seat.ministryName).toBe("Ministério da Fazenda");
  });

  it("shows who holds a chair, with the title the registry gives them", () => {
    const seat = view().seats.find((entry) => entry.ministryKey === "fazenda");

    expect(seat).toMatchObject({
      status: "occupied",
      occupant: {
        characterId: "livia-nogueira",
        name: "Lívia Nogueira",
        publicTitle: "Ministra da Fazenda",
        initials: "LN",
      },
      appointedAtTurn: 1,
    });
  });

  it("says how a minister reads, in the country's own words", () => {
    const seat = view().seats.find((entry) => entry.ministryKey === "fazenda");

    expect(seat.publicAttributes).toEqual({
      competence: "alta",
      loyalty: "incerta",
      influence: "moderada",
      traits: ["Fiscalista", "Independente"],
    });
  });

  it("shows an empty chair as empty, and says nothing about nobody", () => {
    const seat = view().seats.find((entry) => entry.ministryKey === "justica");

    expect(seat).toMatchObject({ status: "vacant", occupant: null, publicAttributes: null });
    expect(seat.appointedAtTurn).toBeNull();
  });

  // The rule this whole view exists for.
  it("never lets a loyalty score across the wire", () => {
    const published = view();

    const loyalties = loyaltiesIn(published);
    expect(loyalties.length).toBeGreaterThan(0);
    for (const loyalty of loyalties) {
      expect(typeof loyalty === "string" || loyalty === null).toBe(true);
    }
    // The same search over the engine's own cabinet finds numbers, so the check above means something.
    expect(loyaltiesIn(createCabinet(brazil)).some(Number.isFinite)).toBe(true);
    expect(findSeat(createCabinet(brazil), "fazenda").loyalty).toBe(64);
  });
});

describe("what the cabinet screen is allowed to offer", () => {
  it("offers to dismiss or replace a minister, and to appoint into an empty chair", () => {
    const seats = view().seats;
    const held = seats.find((entry) => entry.ministryKey === "fazenda");
    const empty = seats.find((entry) => entry.ministryKey === "justica");

    expect(held.availableActions).toEqual(["dismiss", "replace"]);
    expect(empty.availableActions).toEqual(["appoint"]);
  });

  it.each([
    ["the month's action is already spent", { actionsUsed: 1 }],
    ["the Presidency is suspended", { suspended: true }],
    ["the government has ended", { active: false }],
  ])("offers nothing at all when %s", (_, context) => {
    const published = view(context);

    expect(published.actionAvailable).toBe(false);
    for (const seat of published.seats) expect(seat.availableActions).toEqual([]);
  });

  it("remembers the month a change was signed in", () => {
    expect(view({ actionsUsed: 1, turn: 9 }).actionUsedAtTurn).toBe(9);
    expect(view().actionUsedAtTurn).toBeNull();
  });
});

describe("the names the Presidency may still reach for", () => {
  it("leaves out everyone who already holds a portfolio", () => {
    const published = view();
    const inOffice = published.seats
      .filter((seat) => seat.occupant)
      .map((seat) => seat.occupant.characterId);

    for (const candidate of published.candidates) {
      expect(inOffice).not.toContain(candidate.characterId);
    }
  });

  it("offers both of the names written for the empty Justice chair", () => {
    const forJustice = view()
      .candidates.filter((candidate) => candidate.eligibleMinistries.includes("justica"))
      .map((candidate) => candidate.characterId)
      .sort();

    expect(forJustice).toEqual(["bruno-tavares", "dalva-moreno"]);
  });

  it("describes a candidate in words, with a biography and no score", () => {
    const bruno = view().candidates.find((entry) => entry.characterId === "bruno-tavares");

    expect(bruno).toMatchObject({
      id: "justica-bruno",
      name: "Bruno Tavares",
      publicTitle: "Procurador de carreira",
      initials: "BT",
      biography: expect.any(String),
      publicAttributes: { competence: "alta", loyalty: "incerta" },
    });
    expect(bruno.publicAttributes.traits).toEqual(["Institucionalista", "Independente"]);
  });
});
