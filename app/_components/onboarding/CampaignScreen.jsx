"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./CampaignScreen.module.css";

// Electoral prologue: three or four decisions before the vote, on the debate stage. The screen never
// says what a choice costs — the campaign is resolved by the server when the last decision is taken.
export function CampaignScreen({
  country,
  campaign,
  candidate,
  index,
  answers,
  pending,
  error,
  onAnswer,
  onRetry,
  onRestart,
  onBack,
}) {
  const headingId = useId();
  const firstChoiceRef = useRef(null);
  const total = campaign.questions.length;
  // Once the last decision is taken there is no question left to show: the votes are being counted.
  const question = campaign.questions[index] ?? null;

  useEffect(() => {
    firstChoiceRef.current?.focus();
  }, [index]);

  return (
    <main className={styles.screen} aria-labelledby={headingId}>
      <header className={styles.head}>
        <div className={styles.contenders}>
          <p className={styles.candidate}>
            <span className={styles.candidateLabel}>Candidatura</span>
            <span className={styles.candidateName}>{candidate.name || "Sem nome de urna"}</span>
          </p>
          <span className={styles.versus} aria-hidden="true">
            ×
          </span>
          <p className={styles.candidate} data-opponent="true">
            <span className={styles.candidateLabel}>Adversário</span>
            <span className={styles.candidateName}>{campaign.opponent.name}</span>
            <span className={styles.candidateParty}>{campaign.opponent.acronym}</span>
          </p>
        </div>

        <div className={styles.progressBlock}>
          <p className={styles.progress}>
            {question ? `Decisão ${index + 1} de ${total}` : "Campanha encerrada"}
          </p>
          <ol className={styles.track}>
            {campaign.questions.map((entry, position) => (
              <li
                key={entry.id}
                className={styles.trackStep}
                data-state={
                  position < answers.length ? "done" : position === index ? "current" : "ahead"
                }
              >
                <span className={styles.trackMark} aria-hidden="true" />
                <span className={styles.trackText}>
                  {position + 1}
                  <span className="visually-hidden">
                    {position < answers.length
                      ? " decisão tomada"
                      : position === index
                        ? " decisão atual"
                        : " decisão pendente"}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <article className={styles.card}>
        {question ? (
          <>
            <p className={styles.kicker}>
              {question.kicker} · {country.name}
            </p>
            <h1 id={headingId} className={styles.text}>
              {question.text}
            </h1>

            <div className={styles.choices}>
              {["left", "right"].map((side, position) => (
                <button
                  key={side}
                  ref={position === 0 ? firstChoiceRef : null}
                  type="button"
                  className={styles.choice}
                  disabled={pending}
                  onClick={() => onAnswer(side)}
                >
                  <span className={styles.choiceLabel}>{question.options[side].label}</span>
                  <span className={styles.choiceNote}>{question.options[side].note}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className={styles.kicker}>Dia da eleição · Outubro</p>
            <h1 id={headingId} className={styles.text}>
              As urnas fecharam. O país começa a contar os votos.
            </h1>
          </>
        )}
      </article>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {pending ? (
        <p className={styles.status} role="status">
          {question ? "Registrando a decisão…" : "Apurando os votos…"}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className="btn" onClick={onBack} disabled={pending}>
          Voltar
        </button>
        {/* The campaign can be run again from the start while no government exists yet. */}
        {answers.length > 0 && !pending ? (
          <button type="button" className="btn" onClick={onRestart}>
            Recomeçar campanha
          </button>
        ) : null}
        {/* The campaign is never thrown away: a failed count is counted again. */}
        {!question && error && !pending ? (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Tentar novamente
          </button>
        ) : null}
      </div>
    </main>
  );
}
