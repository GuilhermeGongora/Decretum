/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DecisionFeedback } from "@/app/_components/game/DecisionFeedback";
import { buildFeedback, buildGameView } from "./fixtures";

// What the server says left the government this month, already in public words.
const dismissal = [
  {
    type: "dismissed",
    ministryKey: "saude",
    ministryName: "Ministério da Saúde",
    holder: "Dr. Ícaro Nunes",
  },
];

function show(overrides = {}) {
  render(
    <DecisionFeedback
      result={buildFeedback(overrides)}
      game={buildGameView()}
      gameOver={false}
      onContinue={jest.fn()}
    />,
  );
}

describe("a decision that costs a minister", () => {
  it("says who left and which portfolio is now empty", () => {
    show({
      cabinetChanges: dismissal,
      consequence: {
        headline: "Ministro citado na denúncia deixa o cargo às vésperas da votação",
        reaction: "Não é bonito, Presidente, e amanhã os votos estarão lá.",
      },
    });

    expect(screen.getByText("Mudança no gabinete")).toBeTruthy();
    expect(screen.getByText(/Dr\. Ícaro Nunes deixou a pasta, que está vaga/)).toBeTruthy();
  });

  it("says it on a card with no authored consequence either", () => {
    show({ cabinetChanges: dismissal });

    expect(screen.getByText(/Ministério da Saúde: Dr\. Ícaro Nunes deixou a pasta/)).toBeTruthy();
  });

  it("never shows the loyalty the seat was holding", () => {
    show({ cabinetChanges: dismissal });

    // The engine's change carries that number; the view drops it before it reaches the screen.
    expect(document.body.textContent).not.toMatch(/\b58\b/);
  });
});

describe("an ordinary month", () => {
  it("says nothing about the cabinet when nobody moved", () => {
    show({});

    expect(screen.queryByText("Mudança no gabinete")).toBeNull();
    expect(document.body.textContent).not.toMatch(/deixou a pasta/);
  });
});
