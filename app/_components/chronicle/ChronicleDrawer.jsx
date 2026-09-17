"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CharacterAvatar } from "@/app/_components/game/CharacterAvatar";
import { OfficialStamp } from "@/app/_components/game/OfficialStamp";
import { api } from "@/app/_lib/api";
import { PILLARS, errorMessage, formatDelta, formatDossierDate, padTurn } from "@/app/_lib/text";
import styles from "./ChronicleDrawer.module.css";

function Entry({ entry }) {
  const headingId = useId();
  const { calendar, turn } = entry;

  return (
    <li>
      <article className={styles.entry} aria-labelledby={headingId}>
        <OfficialStamp
          variant="deferred"
          heading="Deferido"
          lines={[`${padTurn(turn)}/A${calendar.year}`]}
          className={styles.stamp}
        />
        <div className={styles.entryHead}>
          <CharacterAvatar speaker={entry.speaker} />
          <div className={styles.entryTitle}>
            <p className={styles.date}>
              {formatDossierDate(calendar)} · Mês {padTurn(turn)}
            </p>
            <h3 id={headingId} className={styles.decree}>
              {entry.choiceLabel}
            </h3>
            <p className={styles.speaker}>
              Apresentado por {entry.speaker.name} · {entry.speaker.title}
            </p>
          </div>
        </div>

        <div className={styles.entryBody}>
          {/* The consequence is the snapshot stored with the decision; old decisions have none. */}
          <div className={styles.clipping}>
            {entry.consequence ? (
              <>
                <p className={styles.clippingLabel}>Correio Cívico</p>
                <p className={styles.clippingHeadline}>{entry.consequence.headline}</p>
                <p className={styles.clippingLead}>{entry.resultText}</p>
                <figure className={styles.reaction}>
                  <blockquote className={styles.reactionQuote}>
                    <p>“{entry.consequence.reaction}”</p>
                  </blockquote>
                  <figcaption className={styles.reactionBy}>{entry.speaker.name}</figcaption>
                </figure>
              </>
            ) : (
              <>
                <p className={styles.clippingLabel}>Consequência</p>
                <p className={styles.clippingText}>{entry.resultText}</p>
              </>
            )}
            <p className={styles.dilemma}>{entry.cardText}</p>
          </div>
          <div>
            <p className={styles.clippingLabel}>Movimento</p>
            <ul className={styles.movement}>
              {PILLARS.map(({ key, name }) => {
                const delta = entry.deltas[key];
                const direction = delta > 0 ? "up" : delta < 0 ? "down" : "none";
                return (
                  <li key={key} data-direction={direction}>
                    <span>{name}</span>
                    <span className={styles.delta}>
                      {delta === 0 ? "—" : `${formatDelta(delta)} ${delta > 0 ? "↑" : "↓"}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {entry.flagChanges.length > 0 ? (
          <ul className={styles.flags}>
            {entry.flagChanges.map((change) => (
              <li key={`${change.type}-${change.key}`} data-type={change.type}>
                {change.type === "removed" ? `Encerrado: ${change.label}` : change.label}
              </li>
            ))}
          </ul>
        ) : null}
      </article>
    </li>
  );
}

// Presidential archive: side drawer on desktop, bottom sheet on mobile (design 3d, playbook §6.8).
export function ChronicleDrawer({ gameId, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [state, setState] = useState({ status: "loading" });
  const [year, setYear] = useState("all");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getChronicle(gameId)
      .then((chronicle) => {
        if (!cancelled) setState({ status: "ready", chronicle });
      })
      .catch((error) => {
        if (!cancelled) setState({ status: "error", message: errorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const entries =
    state.status === "ready" ? [...state.chronicle.entries].sort((a, b) => b.turn - a.turn) : [];
  // Constitutional milestones are a separate series, and a government from before the chain existed
  // simply has none: the archive opens the same way either.
  const procedureEntries =
    state.status === "ready"
      ? [...(state.chronicle.procedureEntries ?? [])].sort((a, b) => b.turn - a.turn)
      : [];
  // Who entered and who left the government. A government from before the cabinet existed has none.
  const cabinetEntries =
    state.status === "ready"
      ? [...(state.chronicle.cabinetEntries ?? [])].sort((a, b) => b.turn - a.turn)
      : [];
  const years = [...new Set(entries.map((entry) => entry.calendar.year))].sort((a, b) => a - b);
  const visibleEntries =
    year === "all" ? entries : entries.filter((entry) => entry.calendar.year === year);

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            Crônicas da República
          </h2>
          <p className={styles.meta}>
            Arquivo do governo ·{" "}
            {state.status === "ready" ? `${entries.length} registros` : "consultando"}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          Fechar
        </button>
      </header>

      {years.length > 1 ? (
        <div className={styles.filters} role="group" aria-label="Filtrar registros por ano">
          <button
            type="button"
            className={styles.filter}
            aria-pressed={year === "all"}
            onClick={() => setYear("all")}
          >
            Todos · {entries.length}
          </button>
          {years.map((option) => (
            <button
              key={option}
              type="button"
              className={styles.filter}
              aria-pressed={year === option}
              onClick={() => setYear(option)}
            >
              Ano {option}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.body}>
        {state.status === "loading" ? (
          <p className={styles.status} role="status">
            Consultando o arquivo…
          </p>
        ) : null}
        {state.status === "error" ? (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        ) : null}

        {state.status === "ready" && state.chronicle.inheritedFlags.length > 0 ? (
          <section className={styles.inheritance} aria-labelledby={`${titleId}-inheritance`}>
            <h3 id={`${titleId}-inheritance`} className={styles.inheritanceLabel}>
              Heranças do governo anterior
            </h3>
            <ul className={styles.inheritanceList}>
              {state.chronicle.inheritedFlags.map((flag) => (
                <li key={flag.key}>{flag.label}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {procedureEntries.length > 0 ? (
          <section className={styles.inheritance} aria-labelledby={`${titleId}-procedure`}>
            <h3 id={`${titleId}-procedure`} className={styles.inheritanceLabel}>
              Processo constitucional
            </h3>
            <ul className={styles.inheritanceList}>
              {procedureEntries.map((milestone) => (
                <li key={milestone.id}>
                  {formatDossierDate(milestone.calendar)} · Mês {padTurn(milestone.turn)} ·{" "}
                  {milestone.label} · {milestone.institution}
                  {milestone.note ? ` — ${milestone.note}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cabinetEntries.length > 0 ? (
          <section className={styles.inheritance} aria-labelledby={`${titleId}-cabinet`}>
            <h3 id={`${titleId}-cabinet`} className={styles.inheritanceLabel}>
              Mudanças no gabinete
            </h3>
            <ul className={styles.inheritanceList}>
              {cabinetEntries.map((change) => (
                <li key={change.id}>
                  {formatDossierDate(change.calendar)} · Mês {padTurn(change.turn)} · {change.label}{" "}
                  — {change.summary}
                  {change.source === "decision" ? " (consequência de uma decisão)" : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {state.status === "ready" && entries.length === 0 ? (
          <p className={styles.status}>
            Nenhuma decisão registrada ainda. O primeiro decreto abrirá o arquivo.
          </p>
        ) : null}

        {visibleEntries.length > 0 ? (
          <ol className={styles.entries}>
            {visibleEntries.map((entry) => (
              <Entry key={entry.turn} entry={entry} />
            ))}
          </ol>
        ) : null}
      </div>
    </dialog>
  );
}
