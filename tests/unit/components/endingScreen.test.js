/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { EndingScreen } from "@/app/_components/ending/EndingScreen";
import { buildGameView } from "./fixtures";

function buildFinishedSnapshot(overrides = {}) {
  const meters = {
    people: { value: 0, band: "collapsed_low" },
    market: { value: 58, band: "governable" },
    congress: { value: 44, band: "governable" },
    institutions: { value: 61, band: "governable" },
  };
  return {
    game: buildGameView({ status: "ended", endingCode: "people_abandoned", meters }),
    currentCard: null,
    ending: {
      code: "people_abandoned",
      kind: "collapse",
      title: "As Praças Vazias",
      text: "Sem legitimidade, greves e protestos tornam o governo inviável.",
    },
    summary: {
      primaryMeter: "people",
      simultaneousCrises: [],
      mandateCompleted: false,
      duration: { months: 7, years: 0, remainingMonths: 7 },
      finalMeters: meters,
      decisionsCount: 7,
      topDecisions: [
        {
          turn: 3,
          calendar: { year: 1, monthIndex: 2 },
          speaker: { name: "Joana Reis", title: "Líder da Central dos Trabalhadores" },
          choiceLabel: "Corrigir só a inflação",
          deltas: { people: -6, market: 6, congress: -1, institutions: 0 },
          impact: 13,
        },
      ],
      legacyFlags: [
        { key: "tax_reform_approved", label: "A reforma tributária unificou os impostos." },
      ],
      score: { score: 1840 },
      epithet: { code: "brief_government", title: "O Governo Breve" },
      ...overrides,
    },
  };
}

function renderEnding(props = {}) {
  const handlers = {
    onReadChronicle: jest.fn(),
    onStartSuccessor: jest.fn(),
    onBackToCover: jest.fn(),
  };
  render(
    <EndingScreen
      snapshot={buildFinishedSnapshot()}
      pending={false}
      error={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("EndingScreen", () => {
  it("shows the ending, its cause, final powers and summary without decision controls", () => {
    renderEnding();

    expect(screen.getByRole("heading", { level: 1, name: "As Praças Vazias" })).toBeTruthy();
    expect(screen.getByText("Causa principal").nextElementSibling.textContent).toBe("Povo");
    expect(screen.getByRole("meter", { name: "Povo" }).getAttribute("aria-valuenow")).toBe("0");
    expect(screen.getByText("O Governo Breve")).toBeTruthy();
    expect(screen.getByText("1840 pontos")).toBeTruthy();
    expect(screen.getByText("Corrigir só a inflação")).toBeTruthy();
    expect(screen.getByText("A reforma tributária unificou os impostos.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Escolher/ })).toBeNull();
  });

  it("lets the player read the chronicle and start a successor government", () => {
    const { onReadChronicle, onStartSuccessor } = renderEnding();

    fireEvent.click(screen.getByRole("button", { name: "Ler a crônica" }));
    fireEvent.click(screen.getByRole("button", { name: "Iniciar governo sucessor" }));

    expect(onReadChronicle).toHaveBeenCalledTimes(1);
    expect(onStartSuccessor).toHaveBeenCalledTimes(1);
  });

  it("disables the successor action while a request is pending", () => {
    renderEnding({ pending: true });

    expect(screen.getByRole("button", { name: "Iniciar governo sucessor" }).disabled).toBe(true);
  });
});
