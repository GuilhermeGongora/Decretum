/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CabinetRoom } from "@/app/_components/cabinet/CabinetRoom";

// jsdom does not implement modal dialogs.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

// The cabinet exactly as the server publishes it. No score appears here, because none ever leaves
// the server: the readings arrive already as words.
function cabinetView(over = {}) {
  return {
    actionAvailable: true,
    actionUsedAtTurn: null,
    seats: [
      {
        ministryKey: "fazenda",
        ministryName: "Ministério da Fazenda",
        note: "política econômica e orçamento",
        status: "occupied",
        occupant: {
          characterId: "livia-nogueira",
          name: "Lívia Nogueira",
          publicTitle: "Ministra da Fazenda",
          portrait: "/assets/characters/livia-nogueira.webp",
          initials: "LN",
        },
        publicAttributes: {
          competence: "alta",
          loyalty: "incerta",
          influence: "moderada",
          traits: ["Fiscalista", "Independente"],
        },
        appointedAtTurn: 1,
        availableActions: ["dismiss", "replace"],
      },
      {
        ministryKey: "justica",
        ministryName: "Ministério da Justiça",
        note: "segurança pública e ordem legal",
        status: "vacant",
        occupant: null,
        publicAttributes: null,
        appointedAtTurn: null,
        availableActions: ["appoint"],
      },
    ],
    candidates: [
      {
        id: "justica-bruno",
        characterId: "bruno-tavares",
        name: "Bruno Tavares",
        publicTitle: "Procurador de carreira",
        portrait: null,
        initials: "BT",
        eligibleMinistries: ["justica"],
        biography: "Procurador de carreira com reputação impecável.",
        publicAttributes: {
          competence: "alta",
          loyalty: "incerta",
          influence: "moderada",
          traits: ["Institucionalista"],
        },
      },
    ],
    ...over,
  };
}

function open(props = {}) {
  const onAct = jest.fn().mockResolvedValue(true);
  const onClose = jest.fn();
  render(
    <CabinetRoom cabinet={cabinetView()} turn={4} onAct={onAct} onClose={onClose} {...props} />,
  );
  return { onAct, onClose };
}

const openPortfolio = (name) =>
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`Abrir pasta — ${name}`) }));

describe("the cabinet room", () => {
  it("lists every ministry by the name it signs documents with", () => {
    open();

    expect(screen.getByRole("heading", { name: "Ministério da Fazenda" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ministério da Justiça" })).toBeTruthy();
  });

  it("describes a minister in words, and never in a score", () => {
    open();

    expect(screen.getByText("Lívia Nogueira")).toBeTruthy();
    expect(screen.getByText("incerta")).toBeTruthy();
    // The whole rule this view exists for: no loyalty number ever reaches the screen.
    expect(document.body.textContent).not.toMatch(/\b(?:64|58|74)\b/);
  });

  it("shows an empty chair as a decision, not as a row that failed to load", () => {
    open();

    expect(screen.getByText(/Pasta vaga/)).toBeTruthy();
    expect(screen.getByText(/ainda não indicou um titular/)).toBeTruthy();
  });

  it("falls back to initials for somebody with no portrait", () => {
    open();
    openPortfolio("Ministério da Justiça");

    expect(screen.getByText("BT")).toBeTruthy();
  });

  it("gives the room an accessible name of its own", () => {
    open();
    const dialog = screen.getByRole("heading", { name: "Sala do Gabinete" }).closest("dialog");

    expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
  });

  it("closes when the reader asks it to", () => {
    const { onClose } = open();

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalled();
  });

  // Somebody navigating by keyboard must not lose their place when the room closes, and closing a
  // dialog hands focus to the body — so the room has to put it back itself.
  it("returns focus to whatever opened it", () => {
    const opener = document.createElement("button");
    opener.textContent = "Gabinete";
    document.body.append(opener);
    opener.focus();

    const { unmount } = render(
      <CabinetRoom cabinet={cabinetView()} turn={4} onAct={jest.fn()} onClose={jest.fn()} />,
    );
    // jsdom's stubbed showModal does not move focus into the dialog the way a browser does, so the
    // test moves it by hand. Without this the focus would never leave the opener, and the assertion
    // below would pass even with the restoring code deleted.
    screen.getByRole("button", { name: "Fechar" }).focus();
    expect(document.activeElement).not.toBe(opener);

    unmount();

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe("opening a portfolio", () => {
  it("shows the ministry, what it does and the names available for it", () => {
    open();

    openPortfolio("Ministério da Justiça");

    expect(screen.getByText("segurança pública e ordem legal")).toBeTruthy();
    expect(screen.getByText("Bruno Tavares")).toBeTruthy();
    expect(screen.getByText(/reputação impecável/)).toBeTruthy();
  });

  it("offers nothing at all when the month's action is already spent", () => {
    render(
      <CabinetRoom
        cabinet={cabinetView({
          actionAvailable: false,
          seats: cabinetView().seats.map((seat) => ({ ...seat, availableActions: [] })),
        })}
        turn={4}
        onAct={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    openPortfolio("Ministério da Fazenda");

    expect(screen.getByText(/Nenhuma ação disponível/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Exonerar/ })).toBeNull();
  });

  it("goes back to the whole cabinet", () => {
    open();
    openPortfolio("Ministério da Fazenda");

    fireEvent.click(screen.getByRole("button", { name: "Voltar ao gabinete" }));

    expect(screen.getByRole("heading", { name: "Ministério da Justiça" })).toBeTruthy();
  });
});

describe("confirming a change", () => {
  function reachConfirmation() {
    const handles = open();
    openPortfolio("Ministério da Justiça");
    fireEvent.click(screen.getByRole("button", { name: /Nomear Bruno Tavares/ }));
    return handles;
  }

  it("says plainly what the decision costs before it is signed", () => {
    reachConfirmation();

    expect(
      screen.getByText(/registrada na crônica e consumirá sua ação de gabinete deste mês/),
    ).toBeTruthy();
  });

  it("shows the portfolio, who leaves and who arrives", () => {
    reachConfirmation();
    const summary = screen.getByRole("heading", {
      name: /Nomear · Ministério da Justiça/,
    }).parentElement;

    expect(within(summary).getByText("Pasta vaga")).toBeTruthy();
    expect(within(summary).getByText("Bruno Tavares")).toBeTruthy();
  });

  it("sends the intention and nothing else", () => {
    const { onAct } = reachConfirmation();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onAct).toHaveBeenCalledWith({
      action: "appoint",
      ministryKey: "justica",
      candidateId: "justica-bruno",
    });
    // Nothing the server decides is ever computed here.
    const [payload] = onAct.mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual(["action", "candidateId", "ministryKey"]);
  });

  it("can be abandoned without signing anything", () => {
    const { onAct } = reachConfirmation();

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(onAct).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Nomear Bruno Tavares/ })).toBeTruthy();
  });

  it("cannot be signed twice while the first one is still being registered", () => {
    render(
      <CabinetRoom
        cabinet={cabinetView()}
        turn={4}
        pending
        onAct={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    openPortfolio("Ministério da Justiça");
    fireEvent.click(screen.getByRole("button", { name: /Nomear Bruno Tavares/ }));

    expect(screen.getByRole("button", { name: "Registrando…" }).disabled).toBe(true);
  });
});

describe("when the server refuses", () => {
  it("keeps the room open and says why", () => {
    render(
      <CabinetRoom
        cabinet={cabinetView()}
        turn={4}
        error="A ação de gabinete deste mês já foi usada."
        onAct={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("alert").textContent).toMatch(/já foi usada/);
    expect(screen.getByRole("heading", { name: "Sala do Gabinete" })).toBeTruthy();
  });
});
