/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ChronicleDrawer } from "@/app/_components/chronicle/ChronicleDrawer";
import { api } from "@/app/_lib/api";

jest.mock("@/app/_lib/api", () => ({ api: { getChronicle: jest.fn() } }));

// jsdom does not implement modal dialogs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  api.getChronicle.mockReset();
});

function entry(turn, overrides = {}) {
  return {
    turn,
    calendar: { year: Math.floor((turn - 1) / 12) + 1, monthIndex: (turn - 1) % 12 },
    cardSlug: `card_${turn}`,
    speaker: {
      id: "helena-vasque",
      name: "Helena Vasque",
      title: "Ministra-chefe da Casa Civil",
      initials: "HV",
      portrait: null,
      accent: null,
    },
    cardText: `Dilema do mês ${turn}.`,
    choice: "left",
    choiceLabel: `Decreto ${turn}`,
    resultText: `Consequência do mês ${turn}.`,
    consequence: null,
    deltas: { people: 2, market: -3, congress: 0, institutions: 1 },
    metersBefore: { people: 50, market: 50, congress: 50, institutions: 50 },
    metersAfter: { people: 52, market: 47, congress: 50, institutions: 51 },
    flagChanges: [],
    ...overrides,
  };
}

function chronicle(overrides = {}) {
  return { gameId: "game-1", previousGameId: null, inheritedFlags: [], entries: [], ...overrides };
}

describe("ChronicleDrawer", () => {
  it("lists decisions from the newest to the oldest with consequence and movement", async () => {
    api.getChronicle.mockResolvedValue(chronicle({ entries: [entry(1), entry(2), entry(14)] }));

    render(<ChronicleDrawer gameId="game-1" onClose={jest.fn()} />);

    await screen.findByRole("heading", { name: "Decreto 14" });
    const decrees = screen
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);
    expect(decrees).toEqual(["Decreto 14", "Decreto 2", "Decreto 1"]);

    const newest = screen.getByRole("article", { name: "Decreto 14" });
    expect(within(newest).getByText("Consequência do mês 14.")).toBeTruthy();
    expect(within(newest).getByText("-3 ↓")).toBeTruthy();
    expect(screen.getByText("Arquivo do governo · 3 registros")).toBeTruthy();
  });

  it("filters the archive by year", async () => {
    api.getChronicle.mockResolvedValue(chronicle({ entries: [entry(1), entry(14)] }));
    render(<ChronicleDrawer gameId="game-1" onClose={jest.fn()} />);

    const yearTwo = await screen.findByRole("button", { name: "Ano 2" });
    fireEvent.click(yearTwo);

    expect(yearTwo.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("heading", { name: "Decreto 14" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Decreto 1" })).toBeNull();
  });

  it("shows flag changes and legacies inherited from the previous government", async () => {
    api.getChronicle.mockResolvedValue(
      chronicle({
        inheritedFlags: [
          { key: "tax_reform_approved", label: "A reforma tributária unificou os impostos." },
        ],
        entries: [
          entry(1, {
            flagChanges: [
              { type: "set", key: "strike", label: "A greve está em curso." },
              { type: "removed", key: "raise", label: "O reajuste foi concedido." },
            ],
          }),
        ],
      }),
    );

    render(<ChronicleDrawer gameId="game-1" onClose={jest.fn()} />);

    expect(await screen.findByText("A greve está em curso.")).toBeTruthy();
    expect(screen.getByText("Encerrado: O reajuste foi concedido.")).toBeTruthy();
    expect(screen.getByText("A reforma tributária unificou os impostos.")).toBeTruthy();
  });

  it("invites the first decree when the archive is empty", async () => {
    api.getChronicle.mockResolvedValue(chronicle());

    render(<ChronicleDrawer gameId="game-1" onClose={jest.fn()} />);

    expect(await screen.findByText(/Nenhuma decisão registrada ainda/)).toBeTruthy();
  });

  it("explains when the archive cannot be loaded", async () => {
    api.getChronicle.mockRejectedValue(
      Object.assign(new Error("offline"), { code: "NETWORK_ERROR" }),
    );

    render(<ChronicleDrawer gameId="game-1" onClose={jest.fn()} />);

    expect((await screen.findByRole("alert")).textContent).toMatch(/Sem conexão/);
  });

  it("closes with the close button", async () => {
    api.getChronicle.mockResolvedValue(chronicle());
    const onClose = jest.fn();
    render(<ChronicleDrawer gameId="game-1" onClose={onClose} />);

    fireEvent.click(await screen.findByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the consequence snapshot recorded with a decision", async () => {
    api.getChronicle.mockResolvedValue(
      chronicle({
        entries: [
          entry(3, {
            consequence: {
              headline: "Manchete gravada no mês 3",
              reaction: "Reação gravada no mês 3.",
            },
          }),
        ],
      }),
    );

    render(<ChronicleDrawer gameId="game-1" onClose={jest.fn()} />);

    const article = await screen.findByRole("article", { name: "Decreto 3" });
    expect(within(article).getByText("Correio Cívico")).toBeTruthy();
    expect(within(article).getByText("Manchete gravada no mês 3")).toBeTruthy();
    expect(within(article).getByText("Consequência do mês 3.")).toBeTruthy();
    expect(within(article).getByText("“Reação gravada no mês 3.”")).toBeTruthy();
  });

  it("keeps the result text and initials for an old decision without a consequence", async () => {
    api.getChronicle.mockResolvedValue(
      chronicle({
        entries: [
          entry(2, {
            consequence: null,
            speaker: {
              id: null,
              name: "Helena Arcos",
              title: "Chefe da Casa Civil",
              initials: null,
              portrait: null,
              accent: null,
            },
          }),
        ],
      }),
    );

    render(<ChronicleDrawer gameId="game-1" onClose={jest.fn()} />);

    const article = await screen.findByRole("article", { name: "Decreto 2" });
    expect(within(article).getByText("Consequência do mês 2.")).toBeTruthy();
    expect(within(article).queryByText("Correio Cívico")).toBeNull();
    expect(within(article).getByText("HA")).toBeTruthy();
  });
});
