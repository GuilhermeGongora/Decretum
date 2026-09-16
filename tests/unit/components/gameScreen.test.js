/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { GameScreen } from "@/app/_components/game/GameScreen";
import { buildCardView, buildFeedback, buildGameView } from "./fixtures";

function renderScreen(props = {}) {
  const handlers = {
    onDecide: jest.fn(async () => true),
    onContinue: jest.fn(),
    onOpenChronicle: jest.fn(),
    onOpenSettings: jest.fn(),
  };
  const utils = render(
    <GameScreen
      game={buildGameView()}
      card={buildCardView()}
      feedback={null}
      pending={false}
      error={null}
      notice={null}
      exactEffects={false}
      reducedMotion
      {...handlers}
      {...props}
    />,
  );
  return { ...utils, ...handlers, ...props };
}

const leftButton = () => screen.getByRole("button", { name: "Escolher: Autorizar patrulhas" });
const rightButton = () => screen.getByRole("button", { name: "Escolher: Reforçar polícia civil" });

describe("GameScreen", () => {
  describe("when a government is active", () => {
    it("renders the government, powers, dossier and mandate progress from the current state", () => {
      renderScreen();

      expect(screen.getByText("Aurória")).toBeTruthy();
      expect(screen.getByText("Presidente da República")).toBeTruthy();
      expect(screen.getByText("Julho · Ano 1 · Mês 07/48")).toBeTruthy();

      const people = screen.getByRole("meter", { name: "Povo" });
      expect(people.getAttribute("aria-valuenow")).toBe("35");
      const institutions = screen.getByRole("meter", { name: "Instituições" });
      expect(institutions.getAttribute("aria-valuetext")).toBe("12, Crítico");

      expect(screen.getByRole("heading", { name: "General Otávio Leme" })).toBeTruthy();
      expect(screen.getByText(/manifestantes pedem patrulhamento militar/)).toBeTruthy();
      expect(leftButton()).toBeTruthy();
      expect(rightButton()).toBeTruthy();

      const progress = screen.getByRole("progressbar", { name: "Progresso do mandato" });
      expect(progress.getAttribute("aria-valuenow")).toBe("7");
    });

    it("sends the left decision once when its button is chosen", async () => {
      const { onDecide } = renderScreen();

      fireEvent.click(leftButton());

      await waitFor(() => expect(onDecide).toHaveBeenCalledWith("left"));
      expect(onDecide).toHaveBeenCalledTimes(1);
    });

    it("sends the right decision once when its button is chosen", async () => {
      const { onDecide } = renderScreen();

      fireEvent.click(rightButton());

      await waitFor(() => expect(onDecide).toHaveBeenCalledWith("right"));
      expect(onDecide).toHaveBeenCalledTimes(1);
    });
  });

  describe("keyboard interaction", () => {
    it("previews a side with the arrow keys and confirms it with Enter", async () => {
      const { onDecide } = renderScreen();
      const stage = screen.getByRole("main");

      fireEvent.keyDown(stage, { key: "ArrowRight" });

      expect(screen.getByText("Tendências esperadas")).toBeTruthy();
      expect(document.activeElement).toBe(rightButton());

      fireEvent.keyDown(stage, { key: "Enter" });

      await waitFor(() => expect(onDecide).toHaveBeenCalledWith("right"));
    });

    it("shows the previewed trends on the power indicators", () => {
      renderScreen();

      fireEvent.keyDown(screen.getByRole("main"), { key: "ArrowLeft" });

      const powers = screen.getByRole("region", { name: "Pilares do poder" });
      expect(within(powers).getByText("desce")).toBeTruthy();
      expect(within(powers).getByText("sobe")).toBeTruthy();
      expect(within(powers).getAllByText("sobe leve")).toHaveLength(2);
    });

    it("cancels the preview with Escape so Enter does nothing", () => {
      const { onDecide } = renderScreen();
      const stage = screen.getByRole("main");

      fireEvent.keyDown(stage, { key: "ArrowLeft" });
      fireEvent.keyDown(stage, { key: "Escape" });
      fireEvent.keyDown(stage, { key: "Enter" });

      expect(screen.queryByText("Tendências esperadas")).toBeNull();
      expect(onDecide).not.toHaveBeenCalled();
    });
  });

  describe("pending protection", () => {
    it("ignores further choices while the first decision is being processed", async () => {
      let resolveDecision;
      const onDecide = jest.fn(
        () =>
          new Promise((resolve) => {
            resolveDecision = resolve;
          }),
      );
      renderScreen({ onDecide });

      fireEvent.click(leftButton());
      fireEvent.click(leftButton());
      fireEvent.click(rightButton());

      await waitFor(() => expect(onDecide).toHaveBeenCalledTimes(1));
      expect(leftButton().disabled).toBe(true);
      expect(rightButton().disabled).toBe(true);

      await act(async () => resolveDecision(false));
      expect(leftButton().disabled).toBe(false);
    });

    it("disables both decisions and announces the request while it is pending", () => {
      const { onDecide } = renderScreen({ pending: true });

      fireEvent.click(leftButton());
      fireEvent.keyDown(screen.getByRole("main"), { key: "ArrowRight" });
      fireEvent.keyDown(screen.getByRole("main"), { key: "Enter" });

      expect(leftButton().disabled).toBe(true);
      expect(rightButton().disabled).toBe(true);
      expect(screen.getByRole("status").textContent).toMatch(/Registrando o decreto/);
      expect(onDecide).not.toHaveBeenCalled();
    });

    it("shows a request error as an alert and keeps the decisions available", () => {
      renderScreen({ error: "Sem conexão com o Palácio. Verifique a rede e tente novamente." });

      expect(screen.getByRole("alert").textContent).toMatch(/Sem conexão/);
      expect(leftButton().disabled).toBe(false);
    });
  });

  describe("after the server responds", () => {
    it("prints the authored headline and the speaker's reaction for the chosen side", () => {
      renderScreen({
        feedback: buildFeedback({
          consequence: {
            headline:
              "Governo descarta tropas nas ruas e destina verba extraordinária à polícia civil",
            reaction: "Registro a decisão, Presidente.",
          },
        }),
        game: buildGameView({ turn: 8, calendar: { year: 1, monthIndex: 7 } }),
      });

      expect(
        screen.getByRole("heading", { name: /Governo descarta tropas nas ruas/ }),
      ).toBeTruthy();
      expect(screen.getByText("Correio Cívico")).toBeTruthy();
      expect(screen.getByText("Decreto assinado: Reforçar polícia civil")).toBeTruthy();
      expect(screen.getByText(/resultados demoram a aparecer/)).toBeTruthy();
      expect(screen.getByText("“Registro a decisão, Presidente.”")).toBeTruthy();
      expect(screen.getByText("General Otávio Leme")).toBeTruthy();
      expect(screen.getByText("+6 ↑")).toBeTruthy();
      expect(screen.getByText("Entrada criada na crônica")).toBeTruthy();
      expect(screen.getByText("Registro 07 · Julho · Ano 1")).toBeTruthy();
      expect(screen.queryByText("Nova condição")).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Seguir para Agosto" }),
      );
    });

    it("lists the conditions the decision created, and only those", () => {
      const feedback = buildFeedback({
        consequence: { headline: "Manchete com uma condição nova", reaction: "Reação registrada." },
      });
      feedback.decision.flagChanges = [
        { type: "set", key: "military_patrols", label: "Patrulhas militares ocupam as cidades." },
        { type: "removed", key: "strike", label: "A greve terminou." },
      ];

      renderScreen({ feedback });

      expect(screen.getByText("Nova condição")).toBeTruthy();
      expect(screen.getByText("Patrulhas militares ocupam as cidades.")).toBeTruthy();
      expect(screen.queryByText("A greve terminou.")).toBeNull();
    });

    it("keeps the compact consequence when the card has no authored outcome", () => {
      renderScreen({ feedback: buildFeedback({ consequence: null }) });

      expect(screen.getByRole("heading", { name: "Reforçar polícia civil" })).toBeTruthy();
      expect(screen.queryByText("Correio Cívico")).toBeNull();
      expect(screen.queryByText(/Reação ao decreto/)).toBeNull();
    });

    it("shows the signed decree, its consequence and the movement of each power", () => {
      const { onContinue } = renderScreen({
        feedback: buildFeedback(),
        game: buildGameView({ turn: 8, calendar: { year: 1, monthIndex: 7 } }),
      });

      expect(screen.getByRole("heading", { name: "Reforçar polícia civil" })).toBeTruthy();
      expect(screen.getByText(/resultados demoram a aparecer/)).toBeTruthy();
      expect(screen.getByText("+6 ↑")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /^Escolher/ })).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "Seguir para Agosto" }));
      expect(onContinue).toHaveBeenCalledTimes(1);
    });

    it("offers the ending instead of the next month when the government is over", () => {
      renderScreen({
        feedback: buildFeedback(),
        card: null,
        game: buildGameView({ status: "ended", endingCode: "people_abandoned" }),
      });

      expect(screen.getByRole("button", { name: "Ver o desfecho" })).toBeTruthy();
    });
  });
});
