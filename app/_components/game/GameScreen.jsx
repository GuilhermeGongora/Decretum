"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MANDATE_TURNS } from "@/src/domain/constants";
import { formatDossierDate } from "@/app/_lib/text";
import { ConstitutionalBand } from "@/app/_components/procedure/ConstitutionalBand";
import { ConstitutionalPanel } from "@/app/_components/procedure/ConstitutionalPanel";
import { VoteReveal } from "@/app/_components/procedure/VoteReveal";
import { DecisionChoice } from "./DecisionChoice";
import { DecisionDossier } from "./DecisionDossier";
import { DecisionFeedback } from "./DecisionFeedback";
import { GameShell } from "./GameShell";
import styles from "./GameScreen.module.css";
import { GovernmentHeader } from "./GovernmentHeader";
import { MandateTimeline } from "./MandateTimeline";
import { PowerIndicators } from "./PowerIndicators";

const MAX_DRAG_OFFSET = 190;
const PREVIEW_DISTANCE = 24;
const CONFIRM_DISTANCE = 120;
const MAX_ROTATION = 4;
const EXIT_DURATION_MS = 200;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function isTypingTarget(element) {
  return element instanceof HTMLElement && element.closest("input, textarea, select, dialog");
}

function sideOf(offset) {
  if (offset <= -PREVIEW_DISTANCE) return "left";
  if (offset >= PREVIEW_DISTANCE) return "right";
  return null;
}

// Mounted once per month (keyed by the parent), so interaction state never leaks between cards.
export function GameScreen({
  game,
  card,
  // The public view of the constitutional process, or null for a government facing none.
  procedure = null,
  feedback,
  pending,
  error,
  notice,
  exactEffects,
  reducedMotion,
  onDecide,
  onContinue,
  onOpenChronicle,
  onOpenSettings,
}) {
  const [focusedSide, setFocusedSide] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // The band is what opened the panel, so it is where the reader is returned when it closes.
  const bandRef = useRef(null);
  // Reset every month by the key the parent gives this screen, so a reveal is never shown twice.
  const [voteSeen, setVoteSeen] = useState(false);
  const panelWasOpen = useRef(false);
  // A vote only reaches the screen because the server said one resolved, with the count it stored.
  const voteEvent =
    feedback?.procedureEvent?.type === "vote_resolved" && procedure
      ? feedback.procedureEvent
      : null;
  // Only the side changes state while a finger is down; the distance never does.
  const [draggedSide, setDraggedSide] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [leavingSide, setLeavingSide] = useState(null);
  const dragRef = useRef(null);
  const offsetRef = useRef(0);
  const stageRef = useRef(null);
  const frameRef = useRef(0);
  const decisionLockRef = useRef(false);
  const cardRef = useRef(null);
  const leftButtonRef = useRef(null);
  const rightButtonRef = useRef(null);
  const headingId = useId();
  const helpId = useId();

  const showDecision = !feedback && card;
  const busy = pending || leavingSide !== null;
  const previewSide = showDecision ? (draggedSide ?? focusedSide) : null;

  // The dossier follows the pointer through two custom properties written straight to the node, one
  // frame at a time. Re-rendering React on every pointermove would rebuild the card, the portrait and
  // both panels sixty times a second to move one element by a few pixels.
  function paintDrag() {
    frameRef.current = 0;
    const node = cardRef.current;
    const offset = offsetRef.current;
    if (node && !reducedMotion) {
      node.style.setProperty("--drag-x", `${offset}px`);
      node.style.setProperty("--drag-rot", `${(offset / MAX_DRAG_OFFSET) * MAX_ROTATION}deg`);
    }
    // How near the gesture is to signing, from 0 to 1. Custom properties inherit, so both panels read
    // it from the stage without a prop, a context or a render.
    stageRef.current?.style.setProperty(
      "--drag-progress",
      `${Math.min(1, Math.abs(offset) / CONFIRM_DISTANCE)}`,
    );
    // Crossing the threshold is the only thing the rest of the screen needs to know about.
    const side = sideOf(offset);
    setDraggedSide((current) => (current === side ? current : side));
  }

  function scheduleDrag() {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(paintDrag);
  }

  function clearDrag() {
    offsetRef.current = 0;
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    const node = cardRef.current;
    if (node) {
      node.style.removeProperty("--drag-x");
      node.style.removeProperty("--drag-rot");
    }
    stageRef.current?.style.removeProperty("--drag-progress");
    setDraggedSide(null);
  }

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  async function confirm(side) {
    // The ref blocks a second decision before React re-renders the disabled state.
    if (decisionLockRef.current || pending) return;
    decisionLockRef.current = true;
    clearDrag();
    setLeavingSide(side);
    if (!reducedMotion) await wait(EXIT_DURATION_MS);
    const accepted = await onDecide(side);
    if (!accepted) {
      // The month stands: the dossier comes back and the choice can be taken again.
      decisionLockRef.current = false;
      setLeavingSide(null);
      clearDrag();
    }
  }

  function previewWithKeyboard(side) {
    setFocusedSide(side);
    (side === "left" ? leftButtonRef : rightButtonRef).current?.focus();
  }

  function cancelPreview() {
    setFocusedSide(null);
    clearDrag();
    cardRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (!showDecision || busy) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      previewWithKeyboard(event.key === "ArrowLeft" ? "left" : "right");
    } else if (event.key === "Escape" && previewSide) {
      event.preventDefault();
      cancelPreview();
    } else if (event.key === "Enter" && previewSide) {
      // Prevents the focused button's native click so the decision is sent once.
      event.preventDefault();
      confirm(previewSide);
    }
  }

  // The next month arrives with its paper already on the desk. Focus moves to it, so a screen reader
  // announces the new dossier instead of being left on the body once the consequence is dismissed.
  useEffect(() => {
    if (showDecision) cardRef.current?.focus();
  }, [showDecision]);

  // Returning from the panel has to happen after the dialog is gone: closing one hands focus back to
  // the body, which would wipe anything set while it was still open.
  useEffect(() => {
    if (panelOpen) {
      panelWasOpen.current = true;
      return;
    }
    if (panelWasOpen.current) {
      panelWasOpen.current = false;
      bandRef.current?.querySelector("button")?.focus();
    }
  }, [panelOpen]);

  // Arrow keys also work before anything on the page has focus.
  useEffect(() => {
    if (!showDecision) return undefined;
    function handleDocumentKeyDown(event) {
      if (document.activeElement !== document.body || isTypingTarget(event.target)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      if (!pending) {
        setFocusedSide(event.key === "ArrowLeft" ? "left" : "right");
        (event.key === "ArrowLeft" ? leftButtonRef : rightButtonRef).current?.focus();
      }
    }
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => document.removeEventListener("keydown", handleDocumentKeyDown);
  }, [showDecision, pending]);

  const pointerHandlers = {
    onPointerDown(event) {
      if (busy || (event.pointerType === "mouse" && event.button !== 0)) return;
      dragRef.current = { pointerId: event.pointerId, startX: event.clientX };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
    },
    // Every handler asks whether a gesture is in flight before it asks which one: an environment that
    // leaves `pointerId` undefined would otherwise compare undefined with undefined, pass the guard
    // and dereference a gesture that never started.
    onPointerMove(event) {
      const gesture = dragRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      offsetRef.current = clamp(event.clientX - gesture.startX, -MAX_DRAG_OFFSET, MAX_DRAG_OFFSET);
      scheduleDrag();
    },
    onPointerUp(event) {
      const gesture = dragRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const distance = event.clientX - gesture.startX;
      dragRef.current = null;
      setDragging(false);
      if (Math.abs(distance) >= CONFIRM_DISTANCE) {
        confirm(distance < 0 ? "left" : "right");
      } else {
        // Below the threshold nothing was decided: the dossier settles back where it was.
        clearDrag();
      }
    },
    onPointerCancel(event) {
      const gesture = dragRef.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      clearDrag();
    },
  };

  function choiceState(side) {
    if (!previewSide) return "rest";
    return previewSide === side ? "target" : "opposite";
  }

  const header = (
    <GovernmentHeader
      country={game.country}
      officeTitle={game.country?.office.title}
      calendar={game.calendar}
      turn={game.turn}
      totalTurns={MANDATE_TURNS}
      dimmed={previewSide !== null}
      onOpenChronicle={onOpenChronicle}
      onOpenSettings={onOpenSettings}
    />
  );

  const powers = (
    <PowerIndicators
      meters={game.meters}
      trends={previewSide ? card.choices[previewSide].effects : null}
      deltas={feedback ? feedback.effects : null}
    />
  );

  const footer = (
    <MandateTimeline
      turn={game.turn}
      totalTurns={MANDATE_TURNS}
      hint={showDecision ? "Arraste o dossiê ← ou → · teclas ← → · Enter confirma" : null}
    />
  );

  return (
    <GameShell
      header={header}
      powers={powers}
      footer={footer}
      previewSide={previewSide}
      scene="decision"
      sceneIntensity="soft"
      scenePriority
    >
      <main
        ref={stageRef}
        className={styles.stage}
        aria-busy={pending || undefined}
        onKeyDown={handleKeyDown}
      >
        <h1 className="visually-hidden">
          Gabinete presidencial — {formatDossierDate(game.calendar)}
        </h1>

        {/* Only once the process is public: the band itself decides whether there is anything to
            show, so a government under no procedure sees nothing here. */}
        <div ref={bandRef}>
          <ConstitutionalBand procedure={procedure} onOpen={() => setPanelOpen(true)} />
        </div>

        {/* A house voted this month: the count is already persisted, and this only opens the
            envelope. The consequence waits until the reader has seen it. */}
        {voteEvent && !voteSeen ? (
          <VoteReveal
            event={voteEvent}
            procedure={procedure}
            reducedMotion={reducedMotion}
            onDone={() => setVoteSeen(true)}
          />
        ) : feedback ? (
          <DecisionFeedback
            result={feedback}
            game={game}
            gameOver={game.status !== "active"}
            onContinue={onContinue}
          />
        ) : null}

        {showDecision ? (
          <div className={styles.decision}>
            <div className={styles.leftChoice}>
              <DecisionChoice
                side="left"
                choice={card.choices.left}
                state={choiceState("left")}
                busy={busy}
                exactEffects={exactEffects}
                buttonRef={leftButtonRef}
                onChoose={confirm}
                onPreview={setFocusedSide}
              />
            </div>

            <div className={styles.dossierColumn}>
              <DecisionDossier
                card={card}
                turn={game.turn}
                calendar={game.calendar}
                previewSide={previewSide}
                dragging={dragging}
                leavingSide={leavingSide}
                cardRef={cardRef}
                headingId={headingId}
                helpId={helpId}
                pointerHandlers={pointerHandlers}
              />
              <p className={styles.mobileHint} aria-hidden="true">
                Arraste o dossiê ← ou →
              </p>
            </div>

            <div className={styles.rightChoice}>
              <DecisionChoice
                side="right"
                choice={card.choices.right}
                state={choiceState("right")}
                busy={busy}
                exactEffects={exactEffects}
                buttonRef={rightButtonRef}
                onChoose={confirm}
                onPreview={setFocusedSide}
              />
            </div>
          </div>
        ) : null}

        <div className={styles.messages}>
          {pending ? (
            <p className={styles.status} role="status">
              Registrando o decreto no Palácio…
            </p>
          ) : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {notice && !pending && !error ? <div className={styles.notice}>{notice}</div> : null}
        </div>

        <p id={helpId} className="visually-hidden">
          Arraste o dossiê para a esquerda ou para a direita, ou use as setas do teclado para
          examinar uma decisão. Enter confirma a decisão examinada e Escape cancela a prévia.
        </p>

        {panelOpen ? (
          <ConstitutionalPanel
            procedure={procedure}
            stages={game.country?.removal?.stages ?? []}
            onClose={() => setPanelOpen(false)}
          />
        ) : null}
      </main>
    </GameShell>
  );
}
