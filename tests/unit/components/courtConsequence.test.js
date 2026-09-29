/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { DecisionFeedback } from "@/app/_components/game/DecisionFeedback";
import { buildFeedback, buildGameView } from "./fixtures";

// A ruling exactly as the server publishes it: the score in plain numbers and the sentence already
// written. The screen composes nothing of its own.
const ruling = {
  matterKey: "records_withheld",
  matter: "Recusa de entregar documentos ao Tribunal",
  courtName: "Supremo Tribunal Federal",
  courtShortName: "STF",
  seats: 11,
  votes: 7,
  majority: 6,
  upheld: true,
  summary:
    "O STF decidiu contra o governo: Recusa de entregar documentos ao Tribunal. Placar: 7 a 4.",
};

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

describe("a month the court ruled in", () => {
  it("reports the decision under the court's own name", () => {
    show({
      courtRuling: ruling,
      consequence: {
        headline: "Palácio nega documentos e o Tribunal marca julgamento",
        reaction: "O sigilo não se sustenta, Presidente.",
      },
    });

    expect(screen.getByText("Decisão do STF")).toBeTruthy();
    expect(screen.getByText(/decidiu contra o governo/)).toBeTruthy();
  });

  // The two halves of this screen are written separately, and a field added to only one of them is
  // how something disappears depending on the card that month.
  it("reports it on a card with no authored consequence either", () => {
    show({ courtRuling: ruling });

    expect(screen.getByText(/O STF decidiu contra o governo/)).toBeTruthy();
  });

  it("says the government was spared, when the bench threw the case out", () => {
    show({
      courtRuling: {
        ...ruling,
        upheld: false,
        votes: 3,
        summary: "O STF não acolheu o caso: Limites do cadastro nacional de dados. Placar: 8 a 3.",
      },
    });

    expect(screen.getByText(/não acolheu o caso/)).toBeTruthy();
  });

  // The ruling is an act of the court, never a consequence of the decree the player signed.
  it("keeps the decision apart from the decree's own wording", () => {
    show({ courtRuling: ruling });

    const decree = screen.getByText(/O STF decidiu contra o governo/);
    expect(decree.textContent).not.toMatch(/Deferido/);
  });

  it("never shows where the votes were hiding", () => {
    show({ courtRuling: ruling });

    for (const secret of ["institucionalistas", "Pragmáticos", "Alinhados"]) {
      expect(document.body.textContent).not.toMatch(new RegExp(secret, "i"));
    }
  });
});

describe("an ordinary month", () => {
  it("says nothing about the court when it had nothing before it", () => {
    show({});

    expect(screen.queryByText(/Decisão do/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/STF/);
  });
});
