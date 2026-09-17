/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { VoteReveal } from "@/app/_components/procedure/VoteReveal";

// The server counted the votes, wrote them down and said what happened. Everything here is about
// opening the envelope: no test below asserts a duration, and none of them lets the browser decide
// the outcome.
const CHAMBER = { name: "Câmara dos Deputados", seats: 513, threshold: 342, votes: null };
const SENATE = { name: "Senado Federal", seats: 81, threshold: 54, votes: null };

const procedure = (over = {}) => ({ chamber: CHAMBER, senate: SENATE, ...over });

const chamberVote = (over = {}) => ({
  type: "vote_resolved",
  procedureType: "impeachment",
  stage: "chamber_vote",
  next: "senate_admissibility",
  votes: 361,
  ...over,
});

function renderReveal(props = {}) {
  const onDone = props.onDone ?? jest.fn();
  const utils = render(
    <VoteReveal
      event={props.event ?? chamberVote()}
      procedure={props.procedure ?? procedure()}
      reducedMotion={props.reducedMotion ?? false}
      onDone={onDone}
    />,
  );
  return { ...utils, onDone };
}

describe("revealing a constitutional vote", () => {
  it("states the house, the question and the quorum the constitution asks for", () => {
    renderReveal();

    expect(screen.getByText("Câmara dos Deputados")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Autorizar a abertura do processo/ })).toBeTruthy();
    // The size of the house is printed twice: over the quorum, and under the count.
    expect(screen.getByText(/Quórum constitucional/)).toBeTruthy();
    expect(screen.getAllByText(/de 513/).length).toBeGreaterThan(0);
  });

  it("waits to be opened, and shows no count before it is", () => {
    renderReveal();

    expect(screen.getByRole("button", { name: "Revelar resultado" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Apuração em andamento/);
  });

  it("offers a way past the animation once it has started", () => {
    renderReveal();

    fireEvent.click(screen.getByRole("button", { name: "Revelar resultado" }));

    expect(screen.getByRole("button", { name: "Pular animação" })).toBeTruthy();
  });

  it("gives the result immediately when the animation is skipped", () => {
    renderReveal();

    fireEvent.click(screen.getByRole("button", { name: "Revelar resultado" }));
    fireEvent.click(screen.getByRole("button", { name: "Pular animação" }));

    expect(screen.getByRole("status").textContent).toMatch(/361 de 513 votos favoráveis/);
    expect(screen.getByRole("status").textContent).toMatch(/quórum de 342/);
  });

  it("prints the whole count when the animation is skipped, not the number it had reached", () => {
    // Skipping has to stop the climb as well as end it: a frame still in flight would keep writing
    // over the result, and the reader would be left looking at a partial tally.
    const { container } = renderReveal();

    fireEvent.click(screen.getByRole("button", { name: "Revelar resultado" }));
    fireEvent.click(screen.getByRole("button", { name: "Pular animação" }));

    const printed = [...container.querySelectorAll("span")]
      .filter((node) => !node.children.length && /^\d+$/.test(node.textContent.trim()))
      .map((node) => node.textContent.trim());

    expect(printed).toContain("361");
  });

  it("shows the result at once under reduced motion, with nothing to reveal or skip", () => {
    renderReveal({ reducedMotion: true });

    expect(screen.queryByRole("button", { name: "Revelar resultado" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pular animação" })).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/Autorização concedida/);
  });

  it("reads the outcome in words, for a reader who never sees the gallery", () => {
    renderReveal({ reducedMotion: true });

    const spoken = screen.getByRole("status").textContent;
    expect(spoken).toContain("Autorização concedida");
    expect(spoken).toContain("361");
    expect(spoken).toContain("513");
    expect(spoken).toContain("342");
  });

  it("says the authorisation was denied when the house fell short", () => {
    renderReveal({
      reducedMotion: true,
      event: chamberVote({ next: "archived", votes: 281 }),
    });

    expect(screen.getByRole("status").textContent).toMatch(/Autorização negada/);
  });

  it("names what the Senate decided when it opened the trial", () => {
    renderReveal({
      reducedMotion: true,
      event: {
        type: "vote_resolved",
        procedureType: "impeachment",
        stage: "senate_admissibility",
        next: "suspended",
        votes: 46,
      },
      procedure: procedure({ senate: { ...SENATE, threshold: 41 } }),
    });

    expect(screen.getByRole("status").textContent).toMatch(/Processo instaurado/);
    expect(screen.getByRole("status").textContent).toMatch(/46 de 81/);
  });

  it("separates a conviction from an acquittal at the trial", () => {
    const { unmount } = renderReveal({
      reducedMotion: true,
      event: {
        type: "vote_resolved",
        procedureType: "impeachment",
        stage: "senate_trial",
        next: "removed",
        votes: 62,
      },
    });
    expect(screen.getByRole("status").textContent).toMatch(/Condenação aprovada/);
    unmount();

    renderReveal({
      reducedMotion: true,
      event: {
        type: "vote_resolved",
        procedureType: "impeachment",
        stage: "senate_trial",
        next: "acquitted",
        votes: 53,
      },
    });
    expect(screen.getByRole("status").textContent).toMatch(/Absolvição/);
  });

  it("moves the reader to the way out once the result has settled", () => {
    renderReveal({ reducedMotion: true });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Continuar" }));
  });

  it("hands control back when the reader continues", () => {
    const { onDone } = renderReveal({ reducedMotion: true });

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("never prints anything the outcome was computed from", () => {
    const { container } = renderReveal({ reducedMotion: true });

    for (const internal of ["support", "coalitionCohesion", "evidence", "adherence"]) {
      expect(container.textContent).not.toContain(internal);
    }
  });
});
