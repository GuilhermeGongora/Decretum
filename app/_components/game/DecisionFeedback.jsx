"use client";

import { useEffect, useId, useRef } from "react";
import {
  PILLARS,
  describeBand,
  formatDelta,
  formatDossierDate,
  monthName,
  padTurn,
} from "@/app/_lib/text";
import { CharacterAvatar } from "./CharacterAvatar";
import styles from "./DecisionFeedback.module.css";
import { OfficialStamp } from "./OfficialStamp";

function PowerMovement({ decision, effects, game }) {
  return (
    <div className={styles.movement}>
      <p className={styles.movementLabel}>Movimento dos poderes</p>
      <ul className={styles.movementList}>
        {PILLARS.map(({ key, name }) => {
          const delta = effects[key];
          const meter = game.meters[key];
          const direction = delta > 0 ? "up" : delta < 0 ? "down" : "none";
          return (
            <li key={key} className={styles.movementItem} data-direction={direction}>
              <span className={styles.movementName}>{name}</span>
              <span className={styles.movementValues}>
                <span className={styles.movementValue}>{meter.value}</span>
                <span className={styles.movementDelta}>
                  {delta === 0 ? "sem mudança" : `${formatDelta(delta)} ${delta > 0 ? "↑" : "↓"}`}
                </span>
              </span>
              <span className={styles.movementStatus}>{describeBand(meter.band).statusWord}</span>
              <span className={styles.movementRange}>
                {decision.metersBefore[key]} → {decision.metersAfter[key]}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Shows the server's response to a decision before the next month (design 3c). A choice with authored
// consequence content gets the newspaper edition and the speaker's reaction; older content keeps the
// compact document. Nothing here is written by the browser: every text comes from the API.
export function DecisionFeedback({ result, game, gameOver, onContinue }) {
  const headingId = useId();
  const continueRef = useRef(null);
  const { decision, effects, resultText, consequence, cabinetChanges = [] } = result;
  const signedOn = formatDossierDate(decision.calendar);
  // Only flags this decision set; nothing is shown when no new condition was created.
  const newConditions = decision.flagChanges.filter((change) => change.type === "set");

  useEffect(() => {
    continueRef.current?.focus();
  }, []);

  const movement = <PowerMovement decision={decision} effects={effects} game={game} />;
  const continueButton = (
    <button ref={continueRef} type="button" className={styles.continueButton} onClick={onContinue}>
      {gameOver ? "Ver o desfecho" : `Seguir para ${monthName(game.calendar)}`}
    </button>
  );

  if (!consequence) {
    return (
      <section className={styles.feedback} aria-labelledby={headingId}>
        <div className={styles.document}>
          <OfficialStamp
            variant="deferred"
            heading="República"
            lines={["Deferido"]}
            className={styles.stamp}
          />
          <p className={styles.meta}>Decisão assinada · {signedOn}</p>
          <h2 id={headingId} className={styles.decree}>
            {decision.choiceLabel}
          </h2>
          <p className={styles.consequence}>{resultText}</p>
          <p className={styles.speaker}>
            Despacho apresentado por {decision.speaker.name}, {decision.speaker.title}
          </p>
        </div>
        {cabinetChanges.length > 0 ? (
          <p className={styles.consequence}>
            Mudança no gabinete —{" "}
            {cabinetChanges
              .map((change) => `${change.ministryName}: ${change.holder} deixou a pasta.`)
              .join(" ")}
          </p>
        ) : null}
        {movement}
        {continueButton}
      </section>
    );
  }

  return (
    <section className={`${styles.feedback} ${styles.edition}`} aria-labelledby={headingId}>
      <article className={styles.paper} aria-labelledby={headingId}>
        <header className={styles.masthead}>
          <span className={styles.paperName}>Correio Cívico</span>
          <span className={styles.paperDate}>Edição extra · {signedOn}</span>
        </header>
        <OfficialStamp
          variant="deferred"
          heading="República"
          lines={["Deferido"]}
          className={`${styles.stamp} ${styles.paperStamp}`}
        />
        <p className={styles.paperMeta}>Decreto assinado: {decision.choiceLabel}</p>
        <h2 id={headingId} className={styles.headline}>
          {consequence.headline}
        </h2>
        <p className={styles.lead}>{resultText}</p>
      </article>

      <figure className={styles.reaction}>
        <figcaption className={styles.person}>
          <span className={styles.reactionLabel}>Reação ao decreto</span>
          <span className={styles.personRow}>
            <CharacterAvatar speaker={decision.speaker} size={64} />
            <span className={styles.personText}>
              <span className={styles.personName}>{decision.speaker.name}</span>
              <span className={styles.personTitle}>{decision.speaker.title}</span>
            </span>
          </span>
        </figcaption>
        <blockquote className={styles.quote}>
          <p>“{consequence.reaction}”</p>
        </blockquote>
      </figure>

      {movement}

      <div className={styles.actions}>
        {/* The response only exists after the decision was stored, so it already is a chronicle entry. */}
        <div className={styles.note}>
          <p className={styles.noteLabel}>Entrada criada na crônica</p>
          <p className={styles.noteText}>
            Registro {padTurn(decision.turn)} · {signedOn}
          </p>
          {newConditions.length > 0 ? (
            <>
              <p className={`${styles.noteLabel} ${styles.noteSection}`}>Nova condição</p>
              <ul className={styles.noteList}>
                {newConditions.map((change) => (
                  <li key={change.key}>{change.label}</li>
                ))}
              </ul>
            </>
          ) : null}
          {/* Somebody actually left the government this month: the consequence has to say so, and
              the archive already carries the same change. */}
          {cabinetChanges.length > 0 ? (
            <>
              <p className={`${styles.noteLabel} ${styles.noteSection}`}>Mudança no gabinete</p>
              <ul className={styles.noteList}>
                {cabinetChanges.map((change) => (
                  <li key={change.ministryKey}>
                    {change.ministryName}: {change.holder} deixou a pasta, que está vaga.
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        {continueButton}
      </div>
    </section>
  );
}
