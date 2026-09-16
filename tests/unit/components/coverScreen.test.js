/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { CoverScreen } from "@/app/_components/onboarding/CoverScreen";

function renderCover(props = {}) {
  const handlers = { onNewMandate: jest.fn(), onResume: jest.fn(), onOpenSettings: jest.fn() };
  render(<CoverScreen pending={false} error={null} canResume={false} {...handlers} {...props} />);
  return handlers;
}

describe("CoverScreen", () => {
  it("presents the title, motto and a new mandate action", () => {
    const { onNewMandate } = renderCover();

    expect(screen.getByRole("heading", { level: 1, name: "Decretum" })).toBeTruthy();
    expect(screen.getByText("Salus Populi Suprema Lex")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Novo mandato" }));
    expect(onNewMandate).toHaveBeenCalledTimes(1);
  });

  describe("when there is no saved mandate", () => {
    it("disables Continuar and explains why", () => {
      const { onResume } = renderCover();

      const resume = screen.getByRole("button", { name: "Continuar" });
      fireEvent.click(resume);

      expect(resume.disabled).toBe(true);
      expect(onResume).not.toHaveBeenCalled();
      expect(screen.getByText("Nenhum mandato salvo para continuar")).toBeTruthy();
    });
  });

  describe("when a saved mandate could not be reopened", () => {
    it("lets the player retry and shows the error", () => {
      const { onResume } = renderCover({
        canResume: true,
        error: "Sem conexão com o Palácio. Verifique a rede e tente novamente.",
      });

      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

      expect(onResume).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("alert").textContent).toMatch(/Sem conexão/);
    });
  });

  it("opens the settings", () => {
    const { onOpenSettings } = renderCover();

    fireEvent.click(screen.getByRole("button", { name: "Configurações" }));

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
