import { loadContent } from "@/src/content";
import { cardDefinitions } from "@/src/content/cards";
import { characters } from "@/src/content/characters";
import { countries } from "@/src/content/countries";
import { endingDefinitions } from "@/src/content/endings";
import { epithetDefinitions } from "@/src/content/epithets";
import { flagCatalog } from "@/src/content/flags";
import { validateContent } from "@/src/content/validate";
import { ENDING_CODES, EPITHET_CODES, METERS } from "@/src/domain/constants";
import { applyEventChanges, resolveTurn } from "@/src/domain/turn";
import { POLICIES } from "@/src/simulation";

function sourceContent() {
  return structuredClone({
    cards: cardDefinitions,
    flags: flagCatalog,
    characters,
    countries,
    endings: endingDefinitions,
    epithets: epithetDefinitions,
  });
}

function errorsAfter(mutate) {
  const content = sourceContent();
  mutate(content);
  return validateContent(content).errors;
}

describe("initial content", () => {
  const { cards } = loadContent();
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));

  it("passes validation", () => {
    expect(validateContent(sourceContent()).errors).toEqual([]);
  });

  it("has exactly 30 active cards with unique slugs", () => {
    expect(cards.filter((card) => card.active)).toHaveLength(30);
    expect(new Set(cards.map((card) => card.slug)).size).toBe(30);
  });

  it("gives every card two choices whose effects cover only the four pillars", () => {
    for (const card of cards) {
      for (const side of ["left", "right"]) {
        expect(Object.keys(card.choices[side].effects).sort()).toEqual([...METERS].sort());
      }
    }
  });

  it("schedules only existing chained cards", () => {
    const scheduled = cards.flatMap((card) =>
      [card.choices.left, card.choices.right].flatMap((choice) => choice.schedule),
    );

    expect(scheduled.map((entry) => entry.cardSlug).sort()).toEqual([
      "blackout",
      "strike_escalation",
      "tax_reform_backlash",
    ]);
    for (const entry of scheduled) {
      expect(cardsBySlug.get(entry.cardSlug).type).toBe("chained");
    }
  });

  describe("authored consequences", () => {
    const SIDES = ["left", "right"];
    const activeCards = cards.filter((card) => card.active);
    const outcomes = activeCards.flatMap((card) =>
      SIDES.map((side) => ({ at: `${card.slug}.${side}`, ...card.choices[side] })),
    );

    it("gives both choices of every active card a headline and a reaction", () => {
      const missing = outcomes.flatMap(({ at, headline, reaction }) =>
        Object.entries({ headline, reaction })
          .filter(([, text]) => typeof text !== "string" || text.trim() === "")
          .map(([field]) => `${at}.${field}`),
      );

      expect(outcomes).toHaveLength(60);
      expect(missing).toEqual([]);
    });

    it("keeps headlines within 45–110 characters and reactions within 60–160", () => {
      const outOfRange = outcomes.flatMap(({ at, headline, reaction }) => [
        ...(headline.length < 45 || headline.length > 110
          ? [`${at}.headline ${headline.length}`]
          : []),
        ...(reaction.length < 60 || reaction.length > 160
          ? [`${at}.reaction ${reaction.length}`]
          : []),
      ]);

      expect(outOfRange).toEqual([]);
    });

    it("writes a distinct outcome for each side, without repeating the result text", () => {
      for (const card of activeCards) {
        const { left, right } = card.choices;
        expect(left.headline).not.toBe(right.headline);
        expect(left.reaction).not.toBe(right.reaction);
        for (const choice of [left, right]) {
          expect(choice.headline).not.toBe(choice.reaction);
          expect(choice.headline).not.toBe(choice.resultText);
        }
      }
    });

    it("never repeats a headline or reaction across the deck", () => {
      expect(new Set(outcomes.map((outcome) => outcome.headline)).size).toBe(outcomes.length);
      expect(new Set(outcomes.map((outcome) => outcome.reaction)).size).toBe(outcomes.length);
    });
  });

  it("defines the eight collapse endings and the completed mandate", () => {
    expect(Object.keys(endingDefinitions).sort()).toEqual([...ENDING_CODES].sort());
  });

  it("defines the seven government epithets", () => {
    expect(Object.keys(epithetDefinitions).sort()).toEqual([...EPITHET_CODES].sort());
  });

  it("marks as legacy only the flags produced by the 30 cards", () => {
    const legacyKeys = Object.entries(flagCatalog)
      .filter(([, definition]) => definition.legacy)
      .map(([key]) => key)
      .sort();

    expect(legacyKeys).toEqual([
      "constitutional_precedent",
      "international_green_treaty",
      "national_data_registry",
      "strategic_port_concession",
      "tax_reform_approved",
    ]);
  });
});

describe("validateContent", () => {
  it.each([
    [
      "an unknown pillar",
      (c) => (c.cards[0].leftChoice.effects.power = 3),
      /unknown pillar "power"/,
    ],
    [
      "a non-integer delta",
      (c) => (c.cards[0].leftChoice.effects.people = 2.5),
      /must be an integer/,
    ],
    [
      "a drawable card without weight",
      (c) => (c.cards[0].weight = 0),
      /weight must be a positive integer/,
    ],
    [
      "a negative cooldown",
      (c) => (c.cards[0].cooldownTurns = -1),
      /cooldownTurns must be a non-negative integer/,
    ],
    ["a duplicate slug", (c) => (c.cards[1].slug = c.cards[0].slug), /duplicate slug/],
    [
      "a schedule pointing to a missing card",
      (c) => (c.cards[0].leftChoice.schedule = [{ cardSlug: "ghost", delayTurns: 2 }]),
      /schedules unknown card "ghost"/,
    ],
    [
      "more than one scheduled card per choice",
      (c) =>
        (c.cards[0].leftChoice.schedule = [
          { cardSlug: "blackout", delayTurns: 2 },
          { cardSlug: "strike_escalation", delayTurns: 3 },
        ]),
      /at most one scheduled card/,
    ],
    [
      "a card scheduled for the same month",
      (c) => (c.cards[0].leftChoice.schedule = [{ cardSlug: "blackout", delayTurns: 0 }]),
      /delayTurns must be an integer >= 1/,
    ],
    [
      "an unknown flag",
      (c) => (c.cards[0].leftChoice.setFlags = [{ key: "ghost_flag" }]),
      /unknown flag "ghost_flag"/,
    ],
    [
      "an unknown condition",
      (c) => (c.cards[0].conditions = { script: "1" }),
      /unknown condition "script"/,
    ],
    [
      "an operation outside the engine",
      (c) =>
        (c.cards[0].leftChoice.conditionalEffects = [
          { type: "formula", meter: "people", amount: 1 },
        ]),
      /unknown operation "formula"/,
    ],
    ["executable values", (c) => (c.cards[0].text = () => "texto"), /plain data/],
    ["an unknown speaker", (c) => (c.cards[0].speaker = "ghost"), /unknown speaker "ghost"/],
    ["an unknown card field", (c) => (c.cards[0].eval = "code"), /unknown field "eval"/],
    [
      "an empty headline",
      (c) => (c.cards[0].leftChoice.headline = " "),
      /leftChoice headline must be a non-empty string/,
    ],
    [
      "a reaction that is not text",
      (c) => (c.cards[0].rightChoice.reaction = 42),
      /rightChoice reaction must be a non-empty string/,
    ],
    [
      "a character id that is not kebab-case",
      (c) => (c.characters.helena_vasque = { ...c.characters["helena-vasque"] }),
      /character "helena_vasque": id must be kebab-case/,
    ],
    [
      "a portrait without a crop position",
      (c) => delete c.characters["helena-vasque"].portraitPosition,
      /portrait needs a portraitPosition/,
    ],
    [
      "a portrait outside the character assets",
      (c) => (c.characters["helena-vasque"].portrait = "https://example.com/face.png"),
      /portrait must be a file in \/assets\/characters\//,
    ],
    [
      "an unknown character field",
      (c) => (c.characters["helena-vasque"].script = "x"),
      /unknown field "script"/,
    ],
    [
      "a missing ending",
      (c) => delete c.endings.people_dominant,
      /ending "people_dominant" is missing/,
    ],
  ])("rejects %s", (_, mutate, message) => {
    expect(errorsAfter(mutate)).toContainEqual(expect.stringMatching(message));
  });

  it("accepts a legacy choice without an authored consequence and only warns", () => {
    const content = sourceContent();
    delete content.cards[0].leftChoice.headline;
    delete content.cards[0].leftChoice.reaction;

    const { errors, warnings } = validateContent(content);

    expect(errors).toEqual([]);
    expect(warnings).toContainEqual(
      expect.stringMatching(/emergency_budget.*leftChoice has no headline/),
    );
  });
});

describe("GDD chains", () => {
  const { cards } = loadContent();
  const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));

  function playFrom({ slug, choice, turn }) {
    let state = {
      role: "president",
      status: "active",
      turn,
      meters: { people: 50, market: 50, congress: 50, institutions: 50 },
      flags: {},
      currentCardSlug: slug,
      lastCardSlug: null,
      previousGameId: null,
      mandateCompleted: false,
      endingCode: null,
      simultaneousEndingCodes: [],
      rngSeed: `chain-${slug}`,
    };
    let appearances = [{ turn, cardSlug: slug }];
    let scheduledEvents = [];
    let nextChoice = choice;
    const shown = [];

    for (let step = 0; step < 8 && state.status === "active"; step += 1) {
      const result = resolveTurn({
        state,
        cards,
        choice: nextChoice,
        appearances,
        scheduledEvents,
      });
      scheduledEvents = applyEventChanges(scheduledEvents, result.eventChanges);
      if (result.appearance) {
        appearances = [...appearances, result.appearance];
        shown.push(result.appearance);
      }
      state = result.state;
      if (state.status === "active") {
        nextChoice = POLICIES.center({ card: cardsBySlug.get(state.currentCardSlug), state });
      }
    }

    return shown;
  }

  it.each([
    ["teachers_strike", "right", 1, "strike_escalation", 4],
    ["tax_reform", "left", 10, "tax_reform_backlash", 15],
    ["drought_crisis", "right", 12, "blackout", 16],
  ])("%s (%s) brings %s back in month %i", (slug, choice, turn, chainedSlug, dueTurn) => {
    expect(playFrom({ slug, choice, turn })).toContainEqual({
      turn: dueTurn,
      cardSlug: chainedSlug,
    });
  });
});
