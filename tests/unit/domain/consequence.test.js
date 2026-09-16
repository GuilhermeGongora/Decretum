import { getChoiceConsequence } from "@/src/domain/consequence";
import { resolveTurn } from "@/src/domain/turn";
import { buildActiveState, buildCard, buildMeters, sequenceRng } from "./fixtures";

const LEFT = { headline: "Manchete da escolha à esquerda", reaction: "Reação à esquerda." };
const RIGHT = { headline: "Manchete da escolha à direita", reaction: "Reação à direita." };

const authored = buildCard({ slug: "authored", choices: { left: LEFT, right: RIGHT } });
const legacy = buildCard({ slug: "legacy" });
const filler = buildCard({ slug: "filler" });

function decide(card, choice, state = {}) {
  return resolveTurn({
    state: buildActiveState({ currentCardSlug: card.slug, ...state }),
    cards: [card, filler],
    choice,
    appearances: [],
    scheduledEvents: [],
    rng: sequenceRng([0]),
  });
}

describe("getChoiceConsequence", () => {
  it.each([
    ["left", LEFT],
    ["right", RIGHT],
  ])("returns the authored headline and reaction of the %s choice", (side, expected) => {
    expect(getChoiceConsequence(authored, side)).toEqual(expected);
  });

  it("returns null for a legacy card without authored consequences", () => {
    expect(getChoiceConsequence(legacy, "left")).toBeNull();
  });

  it("returns null when a side has only part of its consequence", () => {
    const partial = buildCard({ choices: { left: { headline: LEFT.headline, reaction: " " } } });

    expect(getChoiceConsequence(partial, "left")).toBeNull();
  });

  it("returns null for a side that does not exist", () => {
    expect(getChoiceConsequence(authored, "up")).toBeNull();
  });
});

describe("when a decision is resolved", () => {
  it("records the consequence of the left choice for a left decision", () => {
    const { decision } = decide(authored, "left");

    expect(decision.consequence).toEqual(LEFT);
    expect(decision.consequence.headline).not.toBe(RIGHT.headline);
  });

  it("records the consequence of the right choice for a right decision", () => {
    const { decision } = decide(authored, "right");

    expect(decision.consequence).toEqual(RIGHT);
    expect(decision.consequence.reaction).not.toBe(LEFT.reaction);
  });

  it("copies the text into the snapshot, so later content edits cannot change it", () => {
    const card = buildCard({ slug: "editable", choices: { left: { ...LEFT }, right: RIGHT } });
    const { decision } = decide(card, "left");

    card.choices.left.headline = "Manchete reescrita depois";

    expect(decision.consequence.headline).toBe(LEFT.headline);
  });

  it("still resolves a legacy card and records no consequence", () => {
    const { decision, state } = decide(legacy, "left");

    expect(decision.consequence).toBeNull();
    expect(decision.resultText).toBe("Algo acontece.");
    expect(state.turn).toBe(6);
  });

  it("records the consequence when the decision ends the government", () => {
    const collapsing = buildCard({
      slug: "collapsing",
      choices: { left: { ...LEFT, effects: { people: -5 } }, right: RIGHT },
    });

    const result = decide(collapsing, "left", { meters: buildMeters({ people: 2 }) });

    expect(result.gameOver).toBe(true);
    expect(result.decision.consequence).toEqual(LEFT);
  });
});
