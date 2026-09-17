import { countries } from "@/src/content/countries";
import { ConflictError, DomainRuleError } from "@/src/errors";
import { createCabinet, findSeat } from "@/src/domain/cabinet";
import { applyEventChanges, resolveTurn, startGame } from "@/src/domain/turn";
import {
  buildActiveState,
  buildCard,
  buildFlag,
  buildFlagDefinition,
  buildMeters,
  sequenceRng,
} from "./fixtures";

const neutralCards = Array.from({ length: 6 }, (_, index) =>
  buildCard({
    slug: `neutral_${index}`,
    choices: {
      left: { effects: { people: 1, market: -1 } },
      right: { effects: { people: -1, market: 1 } },
    },
  }),
);

const teachers = buildCard({
  slug: "teachers",
  choices: {
    left: {
      label: "Conceder reajuste",
      resultText: "As aulas retornam.",
      effects: { people: 7, market: -4, congress: -2 },
      setFlags: [buildFlagDefinition({ key: "teachers_raise", label: "Reajuste concedido" })],
    },
    right: {
      label: "Manter orçamento",
      resultText: "A greve começa.",
      effects: { people: -6, market: 4, congress: 2 },
      setFlags: [buildFlagDefinition({ key: "strike", expiresAfterTurns: 8 })],
      schedule: [{ cardSlug: "escalation", delayTurns: 3, priority: 0 }],
    },
  },
});

const escalation = buildCard({
  slug: "escalation",
  type: "chained",
  weight: 0,
  uniquePerGame: true,
  conditions: { allFlags: ["strike"] },
});

const cards = [teachers, escalation, ...neutralCards];

function resolve(overrides = {}) {
  return resolveTurn({
    state: buildActiveState({ currentCardSlug: "teachers" }),
    cards,
    choice: "left",
    appearances: [{ turn: 5, cardSlug: "teachers" }],
    scheduledEvents: [],
    rng: sequenceRng([0]),
    ...overrides,
  });
}

describe("startGame", () => {
  it("creates an active government in month 1 with every pillar at 50", () => {
    const { state, appearance } = startGame({ cards: neutralCards, rngSeed: "seed-1" });

    expect(state).toMatchObject({
      role: "president",
      status: "active",
      turn: 1,
      meters: { people: 50, market: 50, congress: 50, institutions: 50 },
      flags: {},
      lastCardSlug: null,
      previousGameId: null,
      mandateCompleted: false,
      endingCode: null,
      simultaneousEndingCodes: [],
      rngSeed: "seed-1",
    });
    expect(neutralCards.map((card) => card.slug)).toContain(state.currentCardSlug);
    expect(appearance).toEqual({ turn: 1, cardSlug: state.currentCardSlug });
  });

  it("uses the injected rng to pick the first card", () => {
    const { state } = startGame({ cards: neutralCards, rngSeed: "seed", rng: sequenceRng([0]) });

    expect(state.currentCardSlug).toBe("neutral_0");
  });

  it("accepts starting meters and inherited flags for a successor", () => {
    const { state } = startGame({
      cards: neutralCards,
      rngSeed: "seed",
      meters: buildMeters({ market: 42 }),
      flags: { reform: buildFlag({ inherited: true }) },
      previousGameId: "previous-id",
    });

    expect(state).toMatchObject({
      meters: { market: 42 },
      flags: { reform: { inherited: true } },
      previousGameId: "previous-id",
    });
  });
});

describe("resolveTurn", () => {
  it("applies the chosen deltas and records a snapshot of the decision", () => {
    const { state, decision } = resolve();

    expect(decision).toMatchObject({
      turn: 5,
      cardSlug: "teachers",
      cardVersion: 1,
      choice: "left",
      choiceLabel: "Conceder reajuste",
      resultText: "As aulas retornam.",
      deltas: { people: 7, market: -4, congress: -2, institutions: 0 },
      metersBefore: { people: 50, market: 50, congress: 50, institutions: 50 },
      metersAfter: { people: 57, market: 46, congress: 48, institutions: 50 },
    });
    expect(state.meters).toEqual(decision.metersAfter);
  });

  it("advances to the next month and selects a different card", () => {
    const result = resolve();

    expect(result.state).toMatchObject({
      turn: 6,
      lastCardSlug: "teachers",
      currentCardSlug: "neutral_0",
    });
    expect(result.appearance).toEqual({ turn: 6, cardSlug: "neutral_0" });
    expect(result.gameOver).toBe(false);
    expect(result.ending).toBeNull();
  });

  it("sets the flags of the chosen option", () => {
    const { state, decision } = resolve();

    expect(state.flags.teachers_raise).toMatchObject({ value: true, setAtTurn: 5 });
    expect(decision.flagChanges).toEqual([
      expect.objectContaining({ type: "set", key: "teachers_raise" }),
    ]);
  });

  it("schedules a follow-up card without showing it in the same month", () => {
    const { state, decision, eventChanges } = resolve({
      choice: "right",
      scheduledEvents: [
        { sequence: 4, cardSlug: "neutral_1", turnDue: 2, priority: 0, status: "fired" },
      ],
    });

    expect(eventChanges.created).toEqual([
      {
        sequence: 5,
        cardSlug: "escalation",
        turnDue: 8,
        priority: 0,
        status: "pending",
        createdAtTurn: 5,
      },
    ]);
    expect(decision.scheduledEvents).toEqual([{ cardSlug: "escalation", turnDue: 8 }]);
    expect(state.currentCardSlug).not.toBe("escalation");
  });

  it("shows the scheduled card once it becomes due", () => {
    const result = resolve({
      state: buildActiveState({
        turn: 7,
        currentCardSlug: "neutral_1",
        flags: { strike: buildFlag({ expiresAtTurn: 13 }) },
      }),
      appearances: [{ turn: 7, cardSlug: "neutral_1" }],
      scheduledEvents: [
        { sequence: 1, cardSlug: "escalation", turnDue: 8, priority: 0, status: "pending" },
      ],
    });

    expect(result.state.currentCardSlug).toBe("escalation");
    expect(result.eventChanges).toMatchObject({ firedSequence: 1, cancelledSequences: [] });
  });

  it("expires temporary flags before selecting the card of the next month", () => {
    const result = resolve({
      state: buildActiveState({
        turn: 12,
        currentCardSlug: "neutral_1",
        flags: { strike: buildFlag({ expiresAtTurn: 13 }) },
      }),
      appearances: [{ turn: 12, cardSlug: "neutral_1" }],
      scheduledEvents: [
        { sequence: 1, cardSlug: "escalation", turnDue: 13, priority: 0, status: "pending" },
      ],
    });

    expect(result.state.flags).toEqual({});
    expect(result.expiredFlags).toEqual(["strike"]);
    expect(result.eventChanges.cancelledSequences).toEqual([1]);
    expect(result.state.currentCardSlug).not.toBe("escalation");
  });

  it("ends the government when a pillar reaches an extreme", () => {
    const result = resolve({
      state: buildActiveState({ currentCardSlug: "teachers", meters: buildMeters({ people: 5 }) }),
      choice: "right",
    });

    expect(result.state).toMatchObject({
      status: "ended",
      turn: 5,
      currentCardSlug: null,
      lastCardSlug: "teachers",
      endingCode: "people_abandoned",
      mandateCompleted: false,
    });
    expect(result).toMatchObject({
      gameOver: true,
      appearance: null,
      ending: { code: "people_abandoned", primaryMeter: "people", simultaneousEndingCodes: [] },
    });
  });

  it("completes the mandate after the decision of month 48", () => {
    const result = resolve({
      state: buildActiveState({ turn: 48, currentCardSlug: "neutral_0" }),
      appearances: [{ turn: 48, cardSlug: "neutral_0" }],
    });

    expect(result.state).toMatchObject({
      status: "completed",
      turn: 48,
      mandateCompleted: true,
      endingCode: "mandate_completed",
      currentCardSlug: null,
    });
    expect(result).toMatchObject({ gameOver: true, appearance: null });
    expect(result.ending.code).toBe("mandate_completed");
  });

  it("prefers a collapse over completion in month 48", () => {
    const result = resolve({
      state: buildActiveState({
        turn: 48,
        currentCardSlug: "neutral_0",
        meters: buildMeters({ people: 1 }),
      }),
      choice: "right",
    });

    expect(result.state).toMatchObject({
      status: "ended",
      endingCode: "people_abandoned",
      mandateCompleted: false,
    });
  });

  it("rejects decisions on a government that is no longer active", () => {
    const attempt = () => resolve({ state: buildActiveState({ status: "ended" }) });

    expect(attempt).toThrow(ConflictError);
    expect(attempt).toThrow(expect.objectContaining({ code: "GAME_NOT_ACTIVE" }));
  });

  it("rejects choices other than left or right", () => {
    const attempt = () => resolve({ choice: "up" });

    expect(attempt).toThrow(DomainRuleError);
    expect(attempt).toThrow(expect.objectContaining({ code: "INVALID_CHOICE" }));
  });

  it("produces the same card sequence for the same seed and choices", () => {
    function playTenMonths(rngSeed) {
      let { state, appearance } = startGame({ cards: neutralCards, rngSeed });
      let appearances = [appearance];
      const sequence = [state.currentCardSlug];

      for (let month = 0; month < 10; month += 1) {
        const result = resolveTurn({
          state,
          cards: neutralCards,
          choice: month % 2 === 0 ? "left" : "right",
          appearances,
          scheduledEvents: [],
        });
        state = result.state;
        appearances = [...appearances, result.appearance];
        sequence.push(state.currentCardSlug);
      }

      return sequence;
    }

    expect(playTenMonths("replay")).toEqual(playTenMonths("replay"));
  });
});

// A pack is allowed to declare no removal procedure at all: the content validator returns early for
// one, and every reader of `country.removal` guards for it. The United States pack is exactly that —
// real, shipped content with no removal — so nothing here is invented to make the case.
describe("a country that declares no removal procedure", () => {
  it("resolves the month instead of seeking grounds the pack never defined", () => {
    expect(countries.US.removal).toBeUndefined();

    const result = resolve({ country: countries.US });

    expect(result.state.turn).toBe(6);
    expect(result.procedure).toBeNull();
    expect(result.gameOver).toBe(false);
  });
});

describe("the cabinet across a month", () => {
  const country = {
    keyMinistries: [
      { key: "casa_civil", name: "Casa Civil", note: "coordenação" },
      { key: "fazenda", name: "Fazenda", note: "orçamento" },
      { key: "justica", name: "Justiça", note: "ordem legal" },
    ],
    cabinet: {
      defaultLoyalty: 60,
      holders: [
        { portfolio: "casa_civil", character: "helena-vasque", loyalty: 72 },
        { portfolio: "fazenda", character: "caio-ferraz", loyalty: 48 },
      ],
    },
  };

  const handOver = buildCard({
    slug: "hand_over",
    choices: {
      left: {
        label: "Entregar o ministro",
        effects: { people: -10 },
        cabinet: { dismiss: "most_exposed", loyalty: -8 },
      },
      right: { label: "Proteger o ministro", effects: { congress: -2 } },
    },
  });
  const cabinetCards = [handOver, ...neutralCards];

  function resolveMonth(overrides = {}) {
    return resolveTurn({
      state: buildActiveState({ currentCardSlug: "hand_over" }),
      cards: cabinetCards,
      choice: "left",
      appearances: [{ turn: 5, cardSlug: "hand_over" }],
      scheduledEvents: [],
      rng: sequenceRng([0]),
      country,
      cabinet: createCabinet(country),
      ...overrides,
    });
  }

  it("carries the cabinet through a month that asks nothing of it", () => {
    const result = resolveMonth({ choice: "right" });

    expect(result.cabinet).toEqual(createCabinet(country));
    expect(result.cabinetChanges).toEqual([]);
  });

  it("hands over the least loyal minister when the card asks for one", () => {
    const result = resolveMonth();

    expect(findSeat(result.cabinet, "fazenda")).toMatchObject({ holder: null, loyalty: null });
    expect(result.cabinetChanges).toEqual([
      expect.objectContaining({ type: "dismissed", portfolio: "fazenda", holder: "caio-ferraz" }),
    ]);
  });

  it("costs the ministers who stayed and watched it happen", () => {
    const result = resolveMonth();

    expect(findSeat(result.cabinet, "casa_civil").loyalty).toBe(64);
  });

  it("keeps the cabinet of a government the month brings down", () => {
    const result = resolveMonth({
      state: buildActiveState({ currentCardSlug: "hand_over", meters: buildMeters({ people: 5 }) }),
    });

    expect(result.gameOver).toBe(true);
    expect(findSeat(result.cabinet, "fazenda")).toMatchObject({ holder: null });
  });

  // Every government created before the cabinet existed still has to be playable.
  it("runs the month for a government that has no cabinet at all", () => {
    const result = resolveMonth({ cabinet: null });

    expect(result.cabinet).toBeNull();
    expect(result.cabinetChanges).toEqual([]);
    expect(result.state.turn).toBe(6);
  });
});

describe("applyEventChanges", () => {
  it("adds created events and updates fired and cancelled statuses", () => {
    const events = [
      { sequence: 1, cardSlug: "a", turnDue: 3, priority: 0, status: "pending" },
      { sequence: 2, cardSlug: "b", turnDue: 3, priority: 0, status: "pending" },
    ];
    const created = { sequence: 3, cardSlug: "c", turnDue: 9, priority: 0, status: "pending" };

    expect(
      applyEventChanges(events, { created: [created], firedSequence: 1, cancelledSequences: [2] }),
    ).toEqual([{ ...events[0], status: "fired" }, { ...events[1], status: "cancelled" }, created]);
  });
});
