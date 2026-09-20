/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ElectionNightScreen } from "@/app/_components/onboarding/ElectionNightScreen";

const candidate = {
  name: "Ana Prado",
  treatment: { key: "senhora", label: "Senhora" },
  origin: { key: "sindical", label: "Origem sindical" },
  style: { key: "conciliador", label: "Conciliador" },
  party: { key: "fnt", name: "Frente Nacional do Trabalho", acronym: "FNT" },
  coalition: { key: "ampla", label: "Coligação ampla" },
  promise: { key: "social", label: "Expansão social" },
};

// The count exactly as the server hands it over. The screen decides nothing: who was elected is read
// from the margin.
function election(over = {}) {
  return {
    round: 2,
    share: 51.2,
    opponentShare: 48.8,
    margin: 2.4,
    votes: 55_000_000,
    opponentVotes: 52_000_000,
    validVotes: 107_000_000,
    turnout: 78.4,
    strongholds: ["Nordeste", "Norte"],
    coalitionStrength: 54,
    headline: "País elege nova Presidência por margem apertada",
    summary: "Metade do país votou no outro lado.",
    opponent: {
      name: "Senador Everaldo Brandão",
      party: "Movimento Republicano Popular",
      acronym: "MRP",
    },
    decisions: [],
    ...over,
  };
}

// Reduced motion settles the count immediately, so the result is on screen without faking timers.
function show(over = {}) {
  const onProceed = jest.fn();
  render(
    <ElectionNightScreen
      country={{ code: "BR" }}
      candidate={candidate}
      election={election(over)}
      reducedMotion
      onProceed={onProceed}
    />,
  );
  return { onProceed };
}

const DEFEAT = { share: 49.6, opponentShare: 50.4, margin: -0.8 };

describe("when the campaign is won", () => {
  it("declares the candidate elected and offers the inauguration", () => {
    show();
    // The result block, by the accessible name it carries. The names also appear in the count above,
    // so the assertion has to say which one it means.
    const result = screen.getByLabelText("Presidência eleita");

    expect(within(result).getByText("Ana Prado")).toBeTruthy();
    expect(screen.getByRole("button", { name: /seguir para a posse/ })).toBeTruthy();
  });

  it("gives a date for taking office", () => {
    show();

    expect(screen.getByText("Janeiro · Ano 1")).toBeTruthy();
  });
});

describe("when the campaign is lost", () => {
  it("says the candidacy was defeated, and names who won instead", () => {
    show(DEFEAT);
    const result = screen.getByLabelText("Candidatura derrotada");

    // The winner named in the result block is the opponent, not the player.
    expect(within(result).getByText("Senador Everaldo Brandão")).toBeTruthy();
    expect(within(result).queryByText("Ana Prado")).toBeNull();
    expect(screen.queryByLabelText("Presidência eleita")).toBeNull();
  });

  it("promises no inauguration, because there will not be one", () => {
    show(DEFEAT);

    expect(screen.getByText("Não haverá")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /seguir para a posse/ })).toBeNull();
  });

  it("offers another election instead of a diploma", () => {
    const { onProceed } = show(DEFEAT);
    const again = screen.getByRole("button", { name: "Disputar outra eleição" });

    fireEvent.click(again);

    expect(onProceed).toHaveBeenCalled();
  });

  // Losing is a result, not an error: the count is shown in full, both sides of it.
  it("still shows the whole count", () => {
    show(DEFEAT);

    expect(screen.getByText("49,6%")).toBeTruthy();
    expect(screen.getByText("50,4%")).toBeTruthy();
    expect(screen.getByText("-0,8%")).toBeTruthy();
  });
});
