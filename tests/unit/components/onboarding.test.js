/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { BriefingScreen } from "@/app/_components/onboarding/BriefingScreen";
import { InaugurationScreen } from "@/app/_components/onboarding/InaugurationScreen";
import { buildCandidateSnapshot, buildCountryView, buildElectionView } from "./fixtures";

describe("BriefingScreen", () => {
  it("describes the country institutions and the four powers from the country pack", () => {
    render(<BriefingScreen country={buildCountryView()} onProceed={jest.fn()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "República Federativa do Brasil" }),
    ).toBeTruthy();
    expect(screen.getByText("Presidente da República")).toBeTruthy();
    expect(screen.getByText("4 anos · 48 meses")).toBeTruthy();
    expect(screen.getAllByText("Supremo Tribunal Federal").length).toBeGreaterThan(0);
    expect(screen.getByText(/Câmara dos Deputados/)).toBeTruthy();
    expect(screen.getByText(/Senado Federal/)).toBeTruthy();

    const powers = screen.getByRole("region", { name: "Os quatro poderes" });
    for (const name of ["Povo", "Mercado", "Congresso", "Instituições"]) {
      expect(within(powers).getByText(name)).toBeTruthy();
    }
  });

  it("says the supreme court is not part of the cabinet", () => {
    render(<BriefingScreen country={buildCountryView()} onProceed={jest.fn()} />);

    expect(screen.getByText(/fora do gabinete/)).toBeTruthy();
  });

  it("goes back or opens the first dossier", () => {
    const onBack = jest.fn();
    const onProceed = jest.fn();
    render(<BriefingScreen country={buildCountryView()} onBack={onBack} onProceed={onProceed} />);

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Abrir o primeiro dossiê" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });
});

describe("InaugurationScreen", () => {
  function renderInauguration(props = {}) {
    const onTakeOffice = jest.fn();
    render(
      <InaugurationScreen
        country={buildCountryView()}
        pending={false}
        error={null}
        reducedMotion
        onTakeOffice={onTakeOffice}
        {...props}
      />,
    );
    return { onTakeOffice };
  }

  it("focuses the oath action and takes office when it is chosen", async () => {
    const { onTakeOffice } = renderInauguration();

    const takeOffice = screen.getByRole("button", { name: "Tomar posse" });
    expect(document.activeElement).toBe(takeOffice);

    fireEvent.click(takeOffice);

    await waitFor(() => expect(onTakeOffice).toHaveBeenCalledTimes(1));
  });

  it("signs once, however many times the action is pressed", async () => {
    const { onTakeOffice } = renderInauguration({ candidate: buildCandidateSnapshot() });

    const takeOffice = screen.getByRole("button", { name: "Tomar posse" });
    fireEvent.click(takeOffice);
    fireEvent.click(takeOffice);
    fireEvent.click(takeOffice);

    await waitFor(() => expect(onTakeOffice).toHaveBeenCalledTimes(1));
  });

  it("writes the signature with the name the player registered", () => {
    renderInauguration({ candidate: buildCandidateSnapshot({ name: "Ana Prado" }) });

    // Real text, not an image of a signature: it is readable by assistive technology.
    expect(screen.getByRole("img", { name: "Assinatura de Ana Prado" })).toBeTruthy();
    expect(screen.getByText("Ana Prado · Presidente da República")).toBeTruthy();
  });

  it("keeps a long name inside the paper", () => {
    const name = "Maria Antonieta de Albuquerque Vasconcelos Nogueira";
    renderInauguration({ candidate: buildCandidateSnapshot({ name }) });

    const ink = screen.getByRole("img", { name: `Assinatura de ${name}` });
    expect(ink.querySelector("text").getAttribute("textLength")).toBe("488");
  });

  it("swears the oath of the country that elected the president", () => {
    renderInauguration({
      candidate: buildCandidateSnapshot(),
      election: buildElectionView(),
    });

    expect(screen.getByText(/Prometo manter, defender e cumprir a Constituição/)).toBeTruthy();
    expect(screen.getByText("Ana Prado · FNT")).toBeTruthy();
    expect(screen.getByText("51,8% dos válidos")).toBeTruthy();
    expect(screen.getByText("Brasil")).toBeTruthy();
  });

  it("locks the oath while the government is being created", () => {
    const { onTakeOffice } = renderInauguration({ pending: true });

    const takeOffice = screen.getByRole("button", { name: "Firmando o termo…" });
    fireEvent.click(takeOffice);

    expect(takeOffice.disabled).toBe(true);
    expect(onTakeOffice).not.toHaveBeenCalled();
  });

  it("shows a creation error", () => {
    renderInauguration({ error: "Algo deu errado. Tente novamente em instantes." });

    expect(screen.getByRole("alert").textContent).toMatch(/Tente novamente/);
  });

  describe("for a successor government", () => {
    it("lists the legacies of the finished government", () => {
      renderInauguration({
        mode: "successor",
        legacyFlags: [
          { key: "tax_reform_approved", label: "A reforma tributária unificou os impostos." },
        ],
      });

      const legacy = screen.getByRole("region", { name: "Legados do governo anterior" });
      expect(within(legacy).getByText("A reforma tributária unificou os impostos.")).toBeTruthy();
    });

    it("says when there is nothing to inherit", () => {
      renderInauguration({ mode: "successor", legacyFlags: [] });

      expect(screen.getByText(/não deixou legados/)).toBeTruthy();
    });
  });
});
