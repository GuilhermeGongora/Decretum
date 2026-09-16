/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { BriefingScreen } from "@/app/_components/onboarding/BriefingScreen";
import { InaugurationScreen } from "@/app/_components/onboarding/InaugurationScreen";

describe("BriefingScreen", () => {
  it("describes the republic, its institutions and the four powers from the world profile", () => {
    render(<BriefingScreen onBack={jest.fn()} onProceed={jest.fn()} />);

    expect(screen.getByRole("heading", { level: 1, name: "República de Aurória" })).toBeTruthy();
    expect(screen.getByText("Presidente da República")).toBeTruthy();
    expect(screen.getByText("4 anos · 48 meses")).toBeTruthy();
    expect(screen.getAllByText("Tribunal da Carta").length).toBeGreaterThan(0);

    const powers = screen.getByRole("region", { name: "Os quatro poderes" });
    for (const name of ["Povo", "Mercado", "Congresso", "Instituições"]) {
      expect(within(powers).getByText(name)).toBeTruthy();
    }
  });

  it("goes back or proceeds to the inauguration", () => {
    const onBack = jest.fn();
    const onProceed = jest.fn();
    render(<BriefingScreen onBack={onBack} onProceed={onProceed} />);

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    fireEvent.click(screen.getByRole("button", { name: "Prosseguir para a posse" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });
});

describe("InaugurationScreen", () => {
  it("focuses the oath action and takes office when it is chosen", () => {
    const onTakeOffice = jest.fn();
    render(<InaugurationScreen pending={false} error={null} onTakeOffice={onTakeOffice} />);

    const takeOffice = screen.getByRole("button", { name: "Tomar posse" });
    expect(document.activeElement).toBe(takeOffice);

    fireEvent.click(takeOffice);
    expect(onTakeOffice).toHaveBeenCalledTimes(1);
  });

  it("locks the oath while the government is being created", () => {
    const onTakeOffice = jest.fn();
    render(<InaugurationScreen pending error={null} onTakeOffice={onTakeOffice} />);

    const takeOffice = screen.getByRole("button", { name: "Firmando o termo…" });
    fireEvent.click(takeOffice);

    expect(takeOffice.disabled).toBe(true);
    expect(onTakeOffice).not.toHaveBeenCalled();
  });

  it("shows a creation error", () => {
    render(
      <InaugurationScreen
        pending={false}
        error="Algo deu errado. Tente novamente em instantes."
        onTakeOffice={jest.fn()}
      />,
    );

    expect(screen.getByRole("alert").textContent).toMatch(/Tente novamente/);
  });

  describe("for a successor government", () => {
    it("lists the legacies of the finished government", () => {
      render(
        <InaugurationScreen
          mode="successor"
          legacyFlags={[
            { key: "tax_reform_approved", label: "A reforma tributária unificou os impostos." },
          ]}
          pending={false}
          error={null}
          onBack={jest.fn()}
          onTakeOffice={jest.fn()}
        />,
      );

      const legacy = screen.getByRole("region", { name: "Legados do governo anterior" });
      expect(within(legacy).getByText("A reforma tributária unificou os impostos.")).toBeTruthy();
    });

    it("says when there is nothing to inherit", () => {
      render(
        <InaugurationScreen
          mode="successor"
          legacyFlags={[]}
          pending={false}
          error={null}
          onTakeOffice={jest.fn()}
        />,
      );

      expect(screen.getByText(/não deixou legados/)).toBeTruthy();
    });
  });
});
