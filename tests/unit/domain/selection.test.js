import { NoEligibleCardError } from "@/src/errors";
import { selectCard } from "@/src/domain/selection";
import { buildCard, buildFlag, buildMeters, sequenceRng } from "./fixtures";

function context(overrides = {}) {
  return {
    cards: [],
    role: "president",
    turn: 10,
    flags: {},
    meters: buildMeters(),
    appearances: [],
    lastCardSlug: null,
    scheduledEvents: [],
    rng: sequenceRng([0]),
    ...overrides,
  };
}

function pendingEvent(overrides = {}) {
  return {
    sequence: 1,
    cardSlug: "escalation",
    turnDue: 10,
    priority: 0,
    status: "pending",
    ...overrides,
  };
}

describe("selectCard", () => {
  describe("weighted draw", () => {
    const cards = [
      buildCard({ slug: "b_heavy", weight: 3 }),
      buildCard({ slug: "a_light", weight: 1 }),
    ];

    it("picks cards proportionally to their weight using the injected rng", () => {
      expect(selectCard(context({ cards, rng: sequenceRng([0.2]) })).card.slug).toBe("a_light");
      expect(selectCard(context({ cards, rng: sequenceRng([0.3]) })).card.slug).toBe("b_heavy");
    });

    it("reports the draw as the selection source", () => {
      expect(selectCard(context({ cards }))).toMatchObject({
        source: "draw",
        firedEventSequence: null,
        cancelledEventSequences: [],
        warnings: [],
      });
    });

    it("does not depend on the order in which cards are provided", () => {
      const reversed = [...cards].reverse();
      expect(selectCard(context({ cards: reversed, rng: sequenceRng([0.2]) })).card.slug).toBe(
        "a_light",
      );
    });
  });

  describe("eligibility", () => {
    const fallbackCard = buildCard({ slug: "z_available" });

    it("ignores inactive cards", () => {
      const cards = [buildCard({ slug: "a_inactive", active: false }), fallbackCard];
      expect(selectCard(context({ cards })).card.slug).toBe("z_available");
    });

    it("ignores cards for another role", () => {
      const cards = [buildCard({ slug: "a_mayor", role: "mayor" }), fallbackCard];
      expect(selectCard(context({ cards })).card.slug).toBe("z_available");
    });

    it("ignores cards whose conditions are not met", () => {
      const cards = [buildCard({ slug: "a_late", conditions: { minTurn: 20 } }), fallbackCard];
      expect(selectCard(context({ cards })).card.slug).toBe("z_available");
    });

    it("never draws chained cards", () => {
      const cards = [buildCard({ slug: "a_chained", type: "chained", weight: 0 }), fallbackCard];
      expect(selectCard(context({ cards })).card.slug).toBe("z_available");
    });

    it("does not repeat the immediately previous card", () => {
      const cards = [buildCard({ slug: "a_previous" }), fallbackCard];
      expect(selectCard(context({ cards, lastCardSlug: "a_previous" })).card.slug).toBe(
        "z_available",
      );
    });

    it("does not return unique cards already shown in this government", () => {
      const cards = [buildCard({ slug: "a_once", uniquePerGame: true }), fallbackCard];
      const appearances = [{ turn: 3, cardSlug: "a_once" }];
      expect(selectCard(context({ cards, appearances })).card.slug).toBe("z_available");
    });
  });

  describe("cooldown", () => {
    const cards = [
      buildCard({ slug: "a_cooling", cooldownTurns: 3 }),
      buildCard({ slug: "b_other" }),
    ];
    const appearances = [{ turn: 5, cardSlug: "a_cooling" }];

    it("keeps a card shown on turn 5 with cooldown 3 out of turn 8", () => {
      expect(selectCard(context({ cards, appearances, turn: 8 })).card.slug).toBe("b_other");
    });

    it("makes the card eligible again on turn 9", () => {
      expect(selectCard(context({ cards, appearances, turn: 9 })).card.slug).toBe("a_cooling");
    });
  });

  describe("scheduled events", () => {
    const escalation = buildCard({
      slug: "escalation",
      type: "chained",
      weight: 0,
      uniquePerGame: true,
      conditions: { allFlags: ["strike"] },
    });
    const common = buildCard({ slug: "common" });
    const flags = { strike: buildFlag() };

    it("prioritizes a due scheduled card over the weighted draw", () => {
      const result = selectCard(
        context({ cards: [escalation, common], flags, scheduledEvents: [pendingEvent()] }),
      );

      expect(result.card.slug).toBe("escalation");
      expect(result).toMatchObject({
        source: "scheduled",
        firedEventSequence: 1,
        cancelledEventSequences: [],
      });
    });

    it("waits until the due turn", () => {
      const scheduledEvents = [pendingEvent({ turnDue: 11 })];
      const result = selectCard(context({ cards: [escalation, common], flags, scheduledEvents }));

      expect(result.card.slug).toBe("common");
    });

    it("ignores events that are no longer pending", () => {
      const scheduledEvents = [pendingEvent({ status: "fired" })];
      const result = selectCard(context({ cards: [escalation, common], flags, scheduledEvents }));

      expect(result.card.slug).toBe("common");
    });

    it("orders events due on the same turn by priority, then by creation", () => {
      const other = buildCard({ slug: "other_chain", type: "chained", weight: 0 });
      const cards = [escalation, other, common];

      const byPriority = selectCard(
        context({
          cards,
          flags,
          scheduledEvents: [
            pendingEvent({ sequence: 1, cardSlug: "escalation", priority: 0 }),
            pendingEvent({ sequence: 2, cardSlug: "other_chain", priority: 5 }),
          ],
        }),
      );
      const byCreation = selectCard(
        context({
          cards,
          flags,
          scheduledEvents: [
            pendingEvent({ sequence: 2, cardSlug: "other_chain" }),
            pendingEvent({ sequence: 1, cardSlug: "escalation" }),
          ],
        }),
      );

      expect(byPriority.card.slug).toBe("other_chain");
      expect(byCreation.card.slug).toBe("escalation");
    });

    it("cancels an event whose card conditions are no longer valid and continues", () => {
      const result = selectCard(
        context({ cards: [escalation, common], scheduledEvents: [pendingEvent()] }),
      );

      expect(result.card.slug).toBe("common");
      expect(result).toMatchObject({ source: "draw", cancelledEventSequences: [1] });
    });

    it("cancels an event whose unique card was already shown", () => {
      const result = selectCard(
        context({
          cards: [escalation, common],
          flags,
          appearances: [{ turn: 4, cardSlug: "escalation" }],
          scheduledEvents: [pendingEvent()],
        }),
      );

      expect(result).toMatchObject({ source: "draw", cancelledEventSequences: [1] });
    });
  });

  describe("fallback", () => {
    it("ignores cooldown when nothing else is eligible and reports a warning", () => {
      const cards = [
        buildCard({ slug: "a", cooldownTurns: 30 }),
        buildCard({ slug: "b", cooldownTurns: 30 }),
      ];
      const appearances = [
        { turn: 8, cardSlug: "b" },
        { turn: 9, cardSlug: "a" },
      ];

      const result = selectCard(context({ cards, appearances, lastCardSlug: "a" }));

      expect(result.card.slug).toBe("b");
      expect(result.source).toBe("fallback");
      expect(result.warnings).toEqual([expect.objectContaining({ code: "COOLDOWN_IGNORED" })]);
    });

    it("allows the previous card when it is the only remaining option", () => {
      const cards = [buildCard({ slug: "a", cooldownTurns: 30 })];

      const result = selectCard(
        context({ cards, appearances: [{ turn: 9, cardSlug: "a" }], lastCardSlug: "a" }),
      );

      expect(result.card.slug).toBe("a");
    });

    it("throws when no card satisfies the remaining conditions", () => {
      const cards = [buildCard({ slug: "a", conditions: { minTurn: 20 } })];

      expect(() => selectCard(context({ cards }))).toThrow(NoEligibleCardError);
    });
  });
});
