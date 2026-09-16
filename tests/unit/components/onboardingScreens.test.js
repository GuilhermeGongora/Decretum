/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CampaignScreen } from "@/app/_components/onboarding/CampaignScreen";
import { CandidateScreen } from "@/app/_components/onboarding/CandidateScreen";
import { CountrySelectScreen } from "@/app/_components/onboarding/CountrySelectScreen";
import { ElectionNightScreen } from "@/app/_components/onboarding/ElectionNightScreen";
import {
  buildCampaignView,
  buildCandidateOptionsView,
  buildCandidateSnapshot,
  buildCountryView,
  buildElectionView,
} from "./fixtures";

const inDevelopment = {
  code: "US",
  playable: false,
  name: "Estados Unidos",
  longName: "United States of America",
  system: "República presidencialista federativa",
  summary: "Mandato de quatro anos com eleições de meio de mandato.",
  office: { title: "President of the United States", shortTitle: "President", termMonths: 48 },
  legislature: { name: "Congress" },
  developmentNote: "Pacote em desenvolvimento: regras institucionais e cartas próprias.",
};

describe("CountrySelectScreen", () => {
  function renderSelect(props = {}) {
    const handlers = { onSelect: jest.fn(), onBack: jest.fn() };
    render(
      <CountrySelectScreen
        countries={[buildCountryView(), inDevelopment]}
        loading={false}
        pending={false}
        error={null}
        {...handlers}
        {...props}
      />,
    );
    return handlers;
  }

  it("presents each country as an institutional dossier", () => {
    renderSelect();

    const brazil = screen.getByRole("article", { name: "Brasil" });
    expect(within(brazil).getByText("República Federativa do Brasil")).toBeTruthy();
    expect(within(brazil).getByText("Congresso Nacional")).toBeTruthy();
    expect(within(brazil).getByText("Supremo Tribunal Federal")).toBeTruthy();
    expect(within(brazil).getByText("4 anos · 48 meses")).toBeTruthy();
  });

  it("starts a government in the playable country", () => {
    const { onSelect } = renderSelect();

    fireEvent.click(screen.getByRole("button", { name: "Concorrer no Brasil" }));

    expect(onSelect).toHaveBeenCalledWith("BR");
  });

  it("keeps a country in development sealed, with no way to play it", () => {
    renderSelect();

    const usa = screen.getByRole("article", { name: "Estados Unidos" });
    expect(within(usa).getByText("Em desenvolvimento")).toBeTruthy();
    expect(within(usa).getByText(/Pacote em desenvolvimento/)).toBeTruthy();
    expect(within(usa).queryByRole("button")).toBeNull();
  });

  it("waits for the archive while the dossiers are loading", () => {
    renderSelect({ countries: [], loading: true });

    expect(screen.getByRole("status").textContent).toMatch(/Consultando o arquivo/);
  });
});

describe("CandidateScreen", () => {
  // The overrides are merged into a complete registration: a partial candidate would render an empty
  // card and hide what the test is actually checking.
  function renderCandidate({ candidate: overrides, ...props } = {}) {
    const handlers = { onChange: jest.fn(), onBack: jest.fn(), onProceed: jest.fn() };
    const candidate = {
      name: "",
      treatment: "senhora",
      origin: "sindical",
      style: "conciliador",
      party: "fnt",
      coalition: "ampla",
      promise: "social",
      ...overrides,
    };
    render(
      <CandidateScreen
        country={buildCountryView()}
        options={buildCandidateOptionsView()}
        {...handlers}
        {...props}
        candidate={candidate}
      />,
    );
    return handlers;
  }

  it("separates the registration into identity and platform", () => {
    renderCandidate();

    expect(screen.getByLabelText("Nome de urna")).toBeTruthy();
    expect(screen.getByText(/Identidade política/)).toBeTruthy();
    expect(screen.getByText(/Plataforma e coalizão/)).toBeTruthy();
    expect(screen.getByRole("group", { name: "Partido" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Origem política" })).toBeTruthy();
    expect(screen.getByRole("group", { name: "Principal promessa" })).toBeTruthy();
  });

  it("keeps a registration card in step with the choices", () => {
    renderCandidate({ candidate: { name: "Ana Prado" } });

    const card = screen.getByText("Ficha de registro").closest("aside");
    expect(within(card).getByText("Ana Prado")).toBeTruthy();
    expect(within(card).getByText(/FNT/)).toBeTruthy();
    expect(within(card).getByText("Origem sindical")).toBeTruthy();
    expect(within(card).getByText("Coligação Brasil de Pé")).toBeTruthy();
    expect(within(card).getByText("Expansão social")).toBeTruthy();
  });

  it("says the card is still unnamed before anything is typed", () => {
    renderCandidate();

    expect(screen.getByText("Sem nome de urna")).toBeTruthy();
  });

  it("reports every change to the registration", () => {
    const { onChange } = renderCandidate();

    fireEvent.change(screen.getByLabelText("Nome de urna"), { target: { value: "Ana Prado" } });
    expect(onChange).toHaveBeenCalledWith({ name: "Ana Prado" });

    fireEvent.click(screen.getByRole("radio", { name: /Origem empresarial/ }));
    expect(onChange).toHaveBeenCalledWith({ origin: "empresarial" });
  });

  it("only starts the campaign once the candidate has a name", () => {
    const { onProceed } = renderCandidate();

    const start = screen.getByRole("button", { name: "Iniciar a campanha" });
    expect(start.disabled).toBe(true);
    expect(screen.getByText("Informe o nome de urna para seguir.")).toBeTruthy();

    fireEvent.click(start);
    expect(onProceed).not.toHaveBeenCalled();
  });

  it("starts the campaign when the registration is complete", () => {
    const { onProceed } = renderCandidate({ candidate: { name: "Ana Prado" } });

    fireEvent.click(screen.getByRole("button", { name: "Iniciar a campanha" }));

    expect(onProceed).toHaveBeenCalledTimes(1);
  });
});

describe("CampaignScreen", () => {
  function renderCampaign(props = {}) {
    const handlers = {
      onAnswer: jest.fn(),
      onRetry: jest.fn(),
      onRestart: jest.fn(),
      onBack: jest.fn(),
    };
    render(
      <CampaignScreen
        country={buildCountryView()}
        campaign={buildCampaignView()}
        candidate={{ name: "Ana Prado" }}
        index={0}
        answers={[]}
        pending={false}
        error={null}
        {...handlers}
        {...props}
      />,
    );
    return handlers;
  }

  it("shows one decision at a time, with the progress and both contenders", () => {
    renderCampaign();

    expect(screen.getByText("Decisão 1 de 2")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/primeiro mês/);
    expect(screen.getByText("Ana Prado")).toBeTruthy();
    expect(screen.getByText("Senador Everaldo Brandão")).toBeTruthy();
  });

  it("never reveals what a campaign choice costs", () => {
    renderCampaign();

    const options = screen.getAllByRole("button").map((button) => button.textContent);
    expect(options.join(" ")).not.toMatch(/Povo|Mercado|Congresso|Instituições|[+-]\d/);
  });

  it("reports the side taken", () => {
    const { onAnswer } = renderCampaign();

    fireEvent.click(screen.getByRole("button", { name: /Prometer expansão/ }));

    expect(onAnswer).toHaveBeenCalledWith("right");
  });

  it("offers to run the campaign again once a decision was taken", () => {
    const { onRestart } = renderCampaign({ index: 1, answers: ["left"] });

    fireEvent.click(screen.getByRole("button", { name: "Recomeçar campanha" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it("has nothing to restart before the first decision", () => {
    renderCampaign();

    expect(screen.queryByRole("button", { name: "Recomeçar campanha" })).toBeNull();
  });

  it("shows the count instead of a question once the last decision is taken", () => {
    renderCampaign({ index: 2, answers: ["left", "right"], pending: true });

    expect(screen.getByRole("status").textContent).toMatch(/Apurando os votos/);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/urnas fecharam/);
    expect(screen.queryByRole("button", { name: /Prometer/ })).toBeNull();
    for (const button of screen.getAllByRole("button")) expect(button.disabled).toBe(true);
  });

  it("offers another attempt when the count failed, without losing the campaign", () => {
    const { onRetry } = renderCampaign({
      index: 2,
      answers: ["left", "right"],
      error: "Sem conexão com o Palácio. Verifique a rede e tente novamente.",
    });

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("ElectionNightScreen", () => {
  function renderElection(props = {}) {
    const onProceed = jest.fn();
    render(
      <ElectionNightScreen
        country={buildCountryView()}
        candidate={buildCandidateSnapshot()}
        election={buildElectionView()}
        reducedMotion
        onProceed={onProceed}
        {...props}
      />,
    );
    return { onProceed };
  }

  it("reports the count the server resolved, in Brazilian format", () => {
    renderElection();

    expect(screen.getByText("51,8%")).toBeTruthy();
    expect(screen.getByText("48,2%")).toBeTruthy();
    expect(screen.getByText(/59\.700\.000 votos/)).toBeTruthy();
    expect(screen.getByText("3,6%")).toBeTruthy();
    expect(screen.getByText("78,2%")).toBeTruthy();
    expect(screen.getByText("Nordeste e Norte")).toBeTruthy();
    expect(screen.getByText("58 de 100")).toBeTruthy();
  });

  it("prints the authored headline and names both candidates", () => {
    renderElection();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/margem apertada/);
    expect(screen.getByText("Senador Everaldo Brandão")).toBeTruthy();

    // The winner is named twice: in the count and in the block that declares the presidency.
    const elected = screen.getByRole("region", { name: "Presidência eleita" });
    expect(within(elected).getByText("Ana Prado")).toBeTruthy();
    expect(screen.getAllByText("Ana Prado")).toHaveLength(2);
  });

  it("counts the ballots before showing the result, then settles on it", async () => {
    renderElection({ reducedMotion: false });

    expect(screen.getByText("Urnas em apuração…")).toBeTruthy();
    expect(screen.queryByText("51,8%")).toBeNull();
    expect(screen.queryByRole("button", { name: /seguir para a posse/i })).toBeNull();

    expect(await screen.findByText("100% das urnas apuradas", {}, { timeout: 4000 })).toBeTruthy();
    expect(screen.getByText("51,8%")).toBeTruthy();
  });

  it("skips the count when motion is reduced", () => {
    renderElection();

    expect(screen.getByText("100% das urnas apuradas")).toBeTruthy();
    expect(screen.queryByText("Urnas em apuração…")).toBeNull();
  });

  it("says which round decided the election", () => {
    renderElection({ election: buildElectionView({ round: 2 }) });

    expect(screen.getByText(/Segundo turno/)).toBeTruthy();
  });

  it("focuses the way out and moves to the inauguration", () => {
    const { onProceed } = renderElection();

    const proceed = screen.getByRole("button", { name: /seguir para a posse/i });
    expect(document.activeElement).toBe(proceed);

    fireEvent.click(proceed);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });
});
