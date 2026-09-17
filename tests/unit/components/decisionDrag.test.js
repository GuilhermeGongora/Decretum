/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GameScreen } from "@/app/_components/game/GameScreen";
import { buildCardView, buildFeedback, buildGameView } from "./fixtures";

// The distance that separates examining a decision from signing it. The test drags to either side of
// it; the exact number lives in the component and is not what is being asserted here.
const BELOW_THRESHOLD = 90;
const ABOVE_THRESHOLD = 150;
const START_X = 400;

// jsdom has no PointerEvent, and fireEvent's shorthand builds a bare Event for pointer types — one
// that carries no coordinates at all. A gesture without coordinates is not a gesture, so the events
// are built as MouseEvents, which do carry clientX. `pointerId` stays undefined here exactly as it
// would in a browser without pointer support, which is the case the handlers have to survive.
function pointer(element, type, clientX) {
  fireEvent(element, new MouseEvent(type, { clientX, button: 0, bubbles: true, cancelable: true }));
}

function renderScreen(props = {}) {
  const onDecide = props.onDecide ?? jest.fn(async () => true);
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
      onContinue={jest.fn()}
      onOpenChronicle={jest.fn()}
      onOpenSettings={jest.fn()}
      {...props}
      onDecide={onDecide}
    />,
  );
  // The consequence screen has no dossier at all, so the helper must not insist on finding one.
  return { ...utils, onDecide, dossier: screen.queryByRole("article") };
}

// A whole gesture, from the finger landing on the paper to it leaving.
async function drag(dossier, distance) {
  await act(async () => {
    pointer(dossier, "pointerdown", START_X);
    pointer(dossier, "pointermove", START_X + distance / 2);
    pointer(dossier, "pointermove", START_X + distance);
    pointer(dossier, "pointerup", START_X + distance);
  });
}

const leftButton = () => screen.getByRole("button", { name: "Escolher: Autorizar patrulhas" });

describe("dragging the dossier", () => {
  it("decides nothing when the paper is let go before the threshold", async () => {
    const { onDecide, dossier } = renderScreen();

    await drag(dossier, -BELOW_THRESHOLD);

    expect(onDecide).not.toHaveBeenCalled();
    expect(leftButton().disabled).toBe(false);
  });

  it("signs the left choice when the paper is carried past the threshold to the left", async () => {
    const { onDecide, dossier } = renderScreen();

    await drag(dossier, -ABOVE_THRESHOLD);

    await waitFor(() => expect(onDecide).toHaveBeenCalledWith("left"));
    expect(onDecide).toHaveBeenCalledTimes(1);
  });

  it("signs the right choice when it is carried past the threshold to the right", async () => {
    const { onDecide, dossier } = renderScreen();

    await drag(dossier, ABOVE_THRESHOLD);

    await waitFor(() => expect(onDecide).toHaveBeenCalledWith("right"));
    expect(onDecide).toHaveBeenCalledTimes(1);
  });

  it("sends one decision even if the gesture ends twice", async () => {
    const { onDecide, dossier } = renderScreen();

    await act(async () => {
      pointer(dossier, "pointerdown", START_X);
      pointer(dossier, "pointermove", START_X - ABOVE_THRESHOLD);
      pointer(dossier, "pointerup", START_X - ABOVE_THRESHOLD);
      pointer(dossier, "pointerup", START_X - ABOVE_THRESHOLD);
    });

    await waitFor(() => expect(onDecide).toHaveBeenCalledTimes(1));
  });

  it("does not sign while a decision is already being registered", async () => {
    const { onDecide, dossier } = renderScreen({ pending: true });

    await drag(dossier, -ABOVE_THRESHOLD);

    expect(onDecide).not.toHaveBeenCalled();
  });

  it("gives the paper back when the pointer is cancelled mid-gesture", async () => {
    const { onDecide, dossier } = renderScreen();

    await act(async () => {
      pointer(dossier, "pointerdown", START_X);
      pointer(dossier, "pointermove", START_X - ABOVE_THRESHOLD);
      pointer(dossier, "pointercancel", START_X - ABOVE_THRESHOLD);
    });

    expect(onDecide).not.toHaveBeenCalled();
    expect(dossier.getAttribute("data-preview")).toBeNull();
  });

  it("restores the decision when the server refuses it", async () => {
    const onDecide = jest.fn(async () => false);
    const { dossier } = renderScreen({ onDecide });

    await drag(dossier, -ABOVE_THRESHOLD);

    await waitFor(() => expect(onDecide).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(leftButton().disabled).toBe(false));
    expect(dossier.getAttribute("data-leaving")).toBeNull();
  });

  it("previews the side being dragged towards, before anything is signed", async () => {
    const { onDecide, dossier } = renderScreen();

    await act(async () => {
      pointer(dossier, "pointerdown", START_X);
      pointer(dossier, "pointermove", START_X - BELOW_THRESHOLD);
    });

    await waitFor(() => expect(dossier.getAttribute("data-preview")).toBe("left"));
    expect(onDecide).not.toHaveBeenCalled();
  });
});

describe("when the next dossier arrives", () => {
  it("moves the reader to the new paper instead of leaving them on the page body", () => {
    const { dossier } = renderScreen();

    expect(document.activeElement).toBe(dossier);
  });

  it("announces it by the name it is labelled with", () => {
    const { dossier } = renderScreen();
    const rotulo = document.getElementById(dossier.getAttribute("aria-labelledby"));

    expect(rotulo.textContent).toBe("General Otávio Leme");
  });

  it("does not steal the reader from the consequence, which carries its own action", () => {
    renderScreen({ feedback: buildFeedback(), card: null });

    expect(document.activeElement.tagName).toBe("BUTTON");
    expect(screen.queryByRole("article")).toBeNull();
  });
});
