"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./VoteReveal.module.css";

// The moment a house votes.
//
// Nothing is decided here. The server counted the votes, wrote them to the database and told the
// interface what happened; this screen only opens the envelope. Refreshing the page in the middle of
// it changes nothing, because there is nothing here to recompute.
//
// The house is drawn as benches rather than as 513 separate nodes: a parliament reads as blocs from
// the gallery, and a few dozen elements do not cost a frame.
const BENCHES = 40;
const REVEAL_MS = 1400;

// What the vote was about, in the words of the stage it belongs to.
function describe(event, procedure) {
  const house = event.stage === "chamber_vote" ? procedure.chamber : procedure.senate;
  if (event.stage === "chamber_vote") {
    return {
      house,
      question: "Autorizar a abertura do processo",
      passed: event.next === "senate_admissibility",
      passedLabel: "Autorização concedida",
      failedLabel: "Autorização negada",
    };
  }
  if (event.stage === "senate_admissibility") {
    return {
      house,
      question: "Instaurar o processo e afastar a Presidência",
      passed: event.next === "suspended",
      passedLabel: "Processo instaurado",
      failedLabel: "Processo não instaurado",
    };
  }
  return {
    house,
    question: "Condenar e decretar a perda do cargo",
    passed: event.next === "removed",
    passedLabel: "Condenação aprovada",
    failedLabel: "Absolvição",
  };
}

export function VoteReveal({ event, procedure, reducedMotion = false, onDone }) {
  const titleId = useId();
  const [revealed, setRevealed] = useState(reducedMotion);
  const [settled, setSettled] = useState(reducedMotion);
  const valueRef = useRef(null);
  const barRef = useRef(null);
  const continueRef = useRef(null);

  const { house, question, passed, passedLabel, failedLabel } = describe(event, procedure);
  const votes = event.votes;
  const share = house.seats > 0 ? votes / house.seats : 0;

  // The count climbs by writing to the node, one frame at a time: a re-render per frame would
  // rebuild the whole gallery to move one number.
  useEffect(() => {
    if (!revealed) return undefined;

    // Already settled — skipped, or never animated at all. Writing the final numbers here is what
    // makes "skip" mean skip: the cleanup above cancels any frame still in flight, and nothing is
    // left climbing over the result.
    if (settled || reducedMotion) {
      if (valueRef.current) valueRef.current.textContent = String(votes);
      if (barRef.current) {
        barRef.current.style.setProperty("--counted", `${(votes / house.seats) * 100}%`);
      }
      return undefined;
    }

    let frame = 0;
    const started = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - started) / REVEAL_MS);
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.round(votes * eased);

      if (valueRef.current) valueRef.current.textContent = String(current);
      if (barRef.current) {
        barRef.current.style.setProperty("--counted", `${(current / house.seats) * 100}%`);
      }
      if (progress < 1) frame = requestAnimationFrame(step);
      else setSettled(true);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [revealed, settled, reducedMotion, votes, house.seats]);

  // Once the result is settled the reader is moved to the way out.
  useEffect(() => {
    if (settled) continueRef.current?.focus();
  }, [settled]);

  function skip() {
    setRevealed(true);
    setSettled(true);
  }

  const benches = Array.from({ length: BENCHES }, (_, index) => {
    const filled = settled ? Math.round(share * BENCHES) : 0;
    return index < filled;
  });

  return (
    <section className={styles.reveal} aria-labelledby={titleId} data-passed={passed || undefined}>
      <header className={styles.head}>
        <p className={styles.house}>{house.name}</p>
        <h2 id={titleId} className={styles.question}>
          {question}
        </h2>
        <p className={styles.quorum}>
          Quórum constitucional: <strong>{house.threshold}</strong> de {house.seats}
        </p>
      </header>

      <div className={styles.gallery} aria-hidden="true">
        {benches.map((filled, index) => (
          <span key={index} className={styles.bench} data-filled={filled || undefined} />
        ))}
      </div>

      <div className={styles.tally} ref={barRef}>
        <div className={styles.bar}>
          <span className={styles.fill} data-settled={settled || undefined} />
          <span
            className={styles.threshold}
            style={{ left: `${(house.threshold / house.seats) * 100}%` }}
          />
        </div>
        <p className={styles.count}>
          <span className={styles.value} ref={valueRef}>
            {revealed ? votes : 0}
          </span>
          <span className={styles.unit}>de {house.seats} votos favoráveis</span>
        </p>
      </div>

      {/* The result in words, for a reader who never sees the gallery or the bar. */}
      <p className={styles.outcome} role="status">
        {settled
          ? `${passed ? passedLabel : failedLabel}. ${votes} de ${house.seats} votos favoráveis, com quórum de ${house.threshold}.`
          : "Apuração em andamento."}
      </p>

      <div className={styles.actions}>
        {!revealed ? (
          <button type="button" className={styles.primary} onClick={() => setRevealed(true)}>
            Revelar resultado
          </button>
        ) : null}
        {revealed && !settled ? (
          <button type="button" className={styles.secondary} onClick={skip}>
            Pular animação
          </button>
        ) : null}
        {settled ? (
          <button ref={continueRef} type="button" className={styles.primary} onClick={onDone}>
            Continuar
          </button>
        ) : null}
      </div>
    </section>
  );
}
