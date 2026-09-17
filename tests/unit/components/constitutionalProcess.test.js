/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { GameScreen } from "@/app/_components/game/GameScreen";
import { ConstitutionalBand } from "@/app/_components/procedure/ConstitutionalBand";
import { ConstitutionalPanel } from "@/app/_components/procedure/ConstitutionalPanel";
import { buildCardView, buildGameView } from "./fixtures";

// jsdom does not implement modal dialogs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

// The public view of a process, exactly as the server hands it over. Nothing the outcome is computed
// from appears here, because nothing like it ever leaves the server.
function procedureView(over = {}) {
  return {
    type: "impeachment",
    status: "active",
    stage: { key: "chamber_vote", label: "Votação na Câmara", note: "342 de 513 autorizam" },
    institution: "Câmara dos Deputados",
    nextMilestone: { key: "senate_admissibility", label: "Instauração no Senado" },
    presidency: { key: "in_office", label: "Presidência em exercício" },
    accusation: {
      level: { key: "grave", label: "graves" },
      grounds: [{ key: "audit_cover_up", label: "Obstrução de auditoria" }],
    },
    resolution: null,
    resolutionLabel: null,
    openedAtTurn: 12,
    calendar: { year: 1, monthIndex: 11 },
    deadlineTurn: null,
    turnsLeft: null,
    chamber: {
      name: "Câmara dos Deputados",
      seats: 513,
      threshold: 342,
      votes: null,
      estimate: { low: 322, high: 358 },
    },
    senate: { name: "Senado Federal", seats: 81, threshold: 41, votes: null, estimate: null },
    timeline: [
      {
        turn: 12,
        calendar: { year: 1, monthIndex: 11 },
        stage: "grounds_emerging",
        note: "Obstrução de auditoria",
      },
    ],
    ...over,
  };
}

const STAGES = [
  { key: "grounds_emerging", label: "Fundamento em formação", note: "Indícios reunidos" },
  { key: "petition_filed", label: "Denúncia protocolada", note: "Pedido na Câmara" },
  { key: "speaker_review", label: "Análise da Presidência da Câmara", note: "Admitir ou arquivar" },
  { key: "chamber_campaign", label: "Articulação na Câmara", note: "Contagem de votos" },
  { key: "chamber_vote", label: "Votação na Câmara", note: "342 de 513 autorizam" },
  { key: "senate_admissibility", label: "Instauração no Senado", note: "41 de 81 instauram" },
  { key: "suspended", label: "Presidência afastada", note: "Até seis meses" },
  { key: "senate_trial", label: "Julgamento no Senado", note: "54 de 81 condenam" },
];

describe("the constitutional band", () => {
  it("shows nothing at all for a government facing no process", () => {
    const { container } = render(<ConstitutionalBand procedure={null} onOpen={jest.fn()} />);

    expect(container.firstChild).toBeNull();
  });

  it("stays hidden while the grounds are still being gathered", () => {
    // Internal risk is told through the cards and the chronicle, never through a panel of numbers.
    const { container } = render(
      <ConstitutionalBand
        procedure={procedureView({
          stage: { key: "grounds_emerging", label: "Fundamento em formação", note: null },
        })}
        onOpen={jest.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("disappears once the process has been resolved", () => {
    const { container } = render(
      <ConstitutionalBand
        procedure={procedureView({ status: "resolved", resolution: "archived" })}
        onOpen={jest.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("announces the stage and the way into the dossier", () => {
    render(<ConstitutionalBand procedure={procedureView()} onOpen={jest.fn()} />);

    const band = screen.getByRole("button", { name: /Processo constitucional/ });
    expect(band.getAttribute("aria-label")).toContain("Votação na Câmara");
    expect(screen.getByText("Instauração no Senado")).toBeTruthy();
  });

  it("carries no count and no projection", () => {
    render(<ConstitutionalBand procedure={procedureView()} onOpen={jest.fn()} />);

    const band = screen.getByRole("button", { name: /Processo constitucional/ });
    expect(band.textContent).not.toMatch(/\d{2,}/);
  });

  it("says the presidency is suspended when it is", () => {
    render(
      <ConstitutionalBand
        procedure={procedureView({
          stage: { key: "suspended", label: "Presidência afastada", note: "Até seis meses" },
          presidency: { key: "suspended", label: "Presidência afastada" },
        })}
        onOpen={jest.fn()}
      />,
    );

    const band = screen.getByRole("button", { name: /Presidência afastada/ });
    expect(band).toBeTruthy();
    // The stage and the band share a name here, and saying it twice reads as a stutter.
    expect(band.getAttribute("aria-label")).not.toMatch(
      /Presidência afastada.*Presidência afastada/,
    );
  });

  it("opens the dossier when it is pressed", () => {
    const onOpen = jest.fn();
    render(<ConstitutionalBand procedure={procedureView()} onOpen={onOpen} />);

    fireEvent.click(screen.getByRole("button", { name: /Processo constitucional/ }));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});

describe("the constitutional panel", () => {
  const renderPanel = (over = {}, stages = STAGES) =>
    render(
      <ConstitutionalPanel procedure={procedureView(over)} stages={stages} onClose={jest.fn()} />,
    );

  it("names the stage, the house deciding it and what comes next", () => {
    renderPanel();

    // The house is named twice on purpose: as the institution deciding, and over its own quorum.
    expect(screen.getAllByText("Câmara dos Deputados").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Votação na Câmara").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Instauração no Senado").length).toBeGreaterThan(0);
  });

  it("describes the accusation in words and never as a number", () => {
    renderPanel();

    expect(screen.getByText("graves")).toBeTruthy();
    // The ground names the accusation and also dates the record, so it appears more than once.
    expect(screen.getAllByText("Obstrução de auditoria").length).toBeGreaterThan(0);
  });

  it("gives the quorum each house needs, from the country", () => {
    renderPanel();

    expect(screen.getByText("342 de 513")).toBeTruthy();
    expect(screen.getByText("41 de 81")).toBeTruthy();
  });

  it("shows a projection before the vote and the confirmed count after it", () => {
    const { unmount } = renderPanel();
    expect(screen.getByText("322–358")).toBeTruthy();
    expect(screen.getByText(/projeção de votos/)).toBeTruthy();
    unmount();

    renderPanel({
      stage: { key: "senate_admissibility", label: "Instauração no Senado", note: null },
      chamber: {
        name: "Câmara dos Deputados",
        seats: 513,
        threshold: 342,
        votes: 361,
        estimate: null,
      },
    });

    expect(screen.getByText("361")).toBeTruthy();
    expect(screen.getByText(/votos apurados/)).toBeTruthy();
  });

  it("walks the whole chain, marking what is done and what is still ahead", () => {
    renderPanel();

    // Every stage the country declares appears, so the player sees the road and not only the step.
    for (const stage of STAGES) {
      expect(screen.getAllByText(stage.label).length).toBeGreaterThan(0);
    }
  });

  it("shows the deadline only while the presidency is suspended", () => {
    renderPanel({
      stage: { key: "suspended", label: "Presidência afastada", note: "Até seis meses" },
      presidency: { key: "suspended", label: "Presidência afastada" },
      deadlineTurn: 26,
      turnsLeft: 6,
    });

    expect(screen.getByText(/Prazo do afastamento/)).toBeTruthy();
    expect(screen.getByText(/6 meses/)).toBeTruthy();
  });

  it("reports the resolution once the process is over", () => {
    renderPanel({
      status: "resolved",
      stage: { key: "archived", label: "Pedido arquivado", note: null },
      resolution: "archived",
      resolutionLabel: "Pedido arquivado",
      nextMilestone: null,
    });

    expect(screen.getAllByText("Pedido arquivado").length).toBeGreaterThan(0);
  });

  it("does not break for a government that never faced a process", () => {
    render(<ConstitutionalPanel procedure={null} stages={[]} onClose={jest.fn()} />);

    expect(screen.getByText(/Nenhum processo corre contra esta Presidência/)).toBeTruthy();
  });

  it("closes when the reader asks it to", () => {
    const onClose = jest.fn();
    render(<ConstitutionalPanel procedure={procedureView()} stages={STAGES} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("never prints a number the outcome is computed from", () => {
    const { container } = renderPanel();

    for (const internal of ["support", "coalitionCohesion", "institutionalCredibility", "62"]) {
      expect(container.textContent).not.toContain(internal);
    }
  });
});

describe("the band and the panel together", () => {
  const renderScreen = (procedure = procedureView()) =>
    render(
      <GameScreen
        game={buildGameView()}
        card={buildCardView()}
        procedure={procedure}
        feedback={null}
        pending={false}
        error={null}
        notice={null}
        exactEffects={false}
        reducedMotion
        onDecide={jest.fn(async () => true)}
        onContinue={jest.fn()}
        onOpenChronicle={jest.fn()}
        onOpenSettings={jest.fn()}
      />,
    );

  it("opens the dossier of the process from the band", () => {
    renderScreen();

    fireEvent.click(screen.getByRole("button", { name: /Processo constitucional/ }));

    expect(screen.getByRole("heading", { name: "Processo constitucional" })).toBeTruthy();
  });

  it("returns the reader to the band when the panel closes", () => {
    renderScreen();
    const band = screen.getByRole("button", { name: /Processo constitucional/ });

    fireEvent.click(band);
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    // Closing a dialog hands focus to the body, so the screen has to take it back deliberately.
    expect(document.activeElement).toBe(band);
  });

  it("leaves the month exactly where it was: reading is not deciding", () => {
    const onDecide = jest.fn(async () => true);
    render(
      <GameScreen
        game={buildGameView()}
        card={buildCardView()}
        procedure={procedureView()}
        feedback={null}
        pending={false}
        error={null}
        notice={null}
        exactEffects={false}
        reducedMotion
        onDecide={onDecide}
        onContinue={jest.fn()}
        onOpenChronicle={jest.fn()}
        onOpenSettings={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Processo constitucional/ }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onDecide).not.toHaveBeenCalled();
    expect(screen.getByRole("article")).toBeTruthy();
  });

  it("shows no band at all for a government facing no process", () => {
    renderScreen(null);

    expect(screen.queryByRole("button", { name: /Processo constitucional/ })).toBeNull();
    expect(screen.getByRole("article")).toBeTruthy();
  });
});
