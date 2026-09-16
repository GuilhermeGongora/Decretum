/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DecretumApp from "@/app/_components/DecretumApp";
import { api } from "@/app/_lib/api";
import {
  buildCampaignView,
  buildCandidateOptionsView,
  buildCandidateSnapshot,
  buildCardView,
  buildCountryView,
  buildElectionView,
  buildGameView,
} from "./fixtures";

jest.mock("@/app/_lib/api", () => ({
  api: {
    getCountries: jest.fn(),
    getGame: jest.fn(),
    createGame: jest.fn(),
    decide: jest.fn(),
    createSuccessor: jest.fn(),
    getChronicle: jest.fn(),
  },
}));

const brazil = {
  ...buildCountryView(),
  candidateOptions: buildCandidateOptionsView(),
  campaign: buildCampaignView(),
};

const inDevelopment = {
  code: "US",
  playable: false,
  name: "Estados Unidos",
  longName: "United States of America",
  system: "República presidencialista federativa",
  summary: "Pacote anunciado.",
  office: { title: "President of the United States", termMonths: 48 },
  legislature: { name: "Congress" },
  developmentNote: "Pacote em desenvolvimento.",
};

const createdGame = {
  game: buildGameView({
    turn: 1,
    calendar: { year: 1, monthIndex: 0 },
    candidate: buildCandidateSnapshot(),
    election: buildElectionView(),
  }),
  currentCard: buildCardView(),
};

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  // Reduced motion removes the ballot count and the signature reveal, so the walk is deterministic.
  window.localStorage.setItem(
    "decretum.preferences",
    JSON.stringify({ tutorialSeen: true, reducedMotion: true }),
  );
  api.getCountries.mockResolvedValue({ countries: [brazil, inDevelopment] });
  api.createGame.mockResolvedValue(createdGame);
});

describe("onboarding", () => {
  it("walks from the cover to the first dossier, sending only choices to the server", async () => {
    render(<DecretumApp />);

    fireEvent.click(await screen.findByRole("button", { name: "Novo mandato" }));

    fireEvent.click(await screen.findByRole("button", { name: "Concorrer no Brasil" }));

    fireEvent.change(await screen.findByLabelText("Nome de urna"), {
      target: { value: "Ana Prado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar a campanha" }));

    expect(await screen.findByText("Decisão 1 de 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Prometer expansão/ }));
    expect(await screen.findByText("Decisão 2 de 2")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ir às ruas/ }));

    await waitFor(() => expect(api.createGame).toHaveBeenCalledTimes(1));
    expect(api.createGame).toHaveBeenCalledWith({
      countryCode: "BR",
      candidate: {
        name: "Ana Prado",
        treatment: "senhor",
        origin: "sindical",
        style: "conciliador",
        party: "pcn",
        coalition: "ampla",
        promise: "fiscal",
      },
      campaign: { choices: ["right", "left"] },
    });

    // Election night, then the oath, then the briefing, then the first card of the mandate.
    expect(await screen.findByText("51,8%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /seguir para a posse/i }));

    fireEvent.click(await screen.findByRole("button", { name: "Tomar posse" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "República Federativa do Brasil" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abrir o primeiro dossiê" }));

    expect(
      await screen.findByRole("button", { name: "Escolher: Autorizar patrulhas" }),
    ).toBeTruthy();
    expect(screen.getByText("Brasil")).toBeTruthy();
  });

  it("goes back through the campaign without losing the registration", async () => {
    render(<DecretumApp />);

    fireEvent.click(await screen.findByRole("button", { name: "Novo mandato" }));
    fireEvent.click(await screen.findByRole("button", { name: "Concorrer no Brasil" }));
    fireEvent.change(await screen.findByLabelText("Nome de urna"), {
      target: { value: "Ana Prado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar a campanha" }));
    fireEvent.click(await screen.findByRole("button", { name: /Prometer ajuste/ }));

    fireEvent.click(await screen.findByRole("button", { name: "Voltar" }));
    expect(await screen.findByText("Decisão 1 de 2")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(await screen.findByLabelText("Nome de urna")).toHaveValue?.("Ana Prado");
    expect(screen.getByLabelText("Nome de urna").value).toBe("Ana Prado");
    expect(api.createGame).not.toHaveBeenCalled();
  });

  it("keeps the player in the campaign when the election cannot be resolved", async () => {
    api.createGame.mockRejectedValue(
      Object.assign(new Error("offline"), { code: "NETWORK_ERROR", status: 0 }),
    );
    render(<DecretumApp />);

    fireEvent.click(await screen.findByRole("button", { name: "Novo mandato" }));
    fireEvent.click(await screen.findByRole("button", { name: "Concorrer no Brasil" }));
    fireEvent.change(await screen.findByLabelText("Nome de urna"), {
      target: { value: "Ana Prado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar a campanha" }));
    fireEvent.click(await screen.findByRole("button", { name: /Prometer ajuste/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Ir às ruas/ }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/Sem conexão/);
    expect(screen.getByText("Campanha encerrada")).toBeTruthy();

    // The four decisions survive the failure: the count is retried, the campaign is not run again.
    api.createGame.mockResolvedValue(createdGame);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("51,8%")).toBeTruthy();
    expect(api.createGame).toHaveBeenCalledTimes(2);
    expect(api.createGame.mock.calls[1][0].campaign).toEqual({ choices: ["left", "left"] });
  });

  it("does not let a country in development start a government", async () => {
    render(<DecretumApp />);

    fireEvent.click(await screen.findByRole("button", { name: "Novo mandato" }));
    await screen.findByRole("button", { name: "Concorrer no Brasil" });

    expect(screen.queryByRole("button", { name: /Estados Unidos/ })).toBeNull();
    expect(screen.getByText("Em desenvolvimento")).toBeTruthy();
  });
});
