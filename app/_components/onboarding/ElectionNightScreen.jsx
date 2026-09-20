"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CountryFlag } from "@/app/_components/game/CountryFlag";
import styles from "./ElectionNightScreen.module.css";

const formatVotes = (votes) => new Intl.NumberFormat("pt-BR").format(votes);
const formatPercent = (value) => `${value.toFixed(1).replace(".", ",")}%`;

const COUNT_DURATION_MS = 1600;

// Election night. Every number was computed by the server and stored with the government; the count
// that runs first is a presentational reveal of data already in hand, not a pretend request.
export function ElectionNightScreen({ country, candidate, election, reducedMotion, onProceed }) {
  const headingId = useId();
  const proceedRef = useRef(null);
  const [counted, setCounted] = useState(() => Boolean(reducedMotion));

  useEffect(() => {
    if (counted) return undefined;
    const timer = setTimeout(() => setCounted(true), COUNT_DURATION_MS);
    return () => clearTimeout(timer);
  }, [counted]);

  useEffect(() => {
    if (counted) proceedRef.current?.focus();
  }, [counted]);

  // The count decides who was elected, not the fact that this is the player's screen.
  const defeated = election.margin < 0;

  const rows = [
    {
      key: "winner",
      name: candidate.name,
      detail: `${candidate.party.acronym} · ${candidate.coalition.label}`,
      share: election.share,
      votes: election.votes,
      elected: !defeated,
    },
    {
      key: "opponent",
      name: election.opponent.name,
      detail: `${election.opponent.acronym} · ${defeated ? "eleita" : "oposição"}`,
      share: election.opponentShare,
      votes: election.opponentVotes,
      elected: defeated,
    },
  ];

  return (
    <main className={styles.screen} aria-labelledby={headingId} data-counted={counted || undefined}>
      <header className={styles.head}>
        <CountryFlag code={country.code} />
        <p className={styles.eyebrow}>
          Apuração oficial · {election.round === 1 ? "Primeiro turno" : "Segundo turno"}
        </p>
        <span className={styles.spacer} />
        <p className={styles.counted}>
          {counted ? "100% das urnas apuradas" : "Urnas em apuração…"}
        </p>
      </header>

      {counted ? (
        <article className={styles.paper}>
          <p className={styles.masthead}>Correio Cívico · Edição da madrugada</p>
          <h1 id={headingId} className={styles.headline}>
            {election.headline}
          </h1>
          <p className={styles.lead}>{election.summary}</p>
        </article>
      ) : (
        <article className={styles.counting} role="status">
          <p className={styles.masthead}>Correio Cívico · Edição da madrugada</p>
          <h1 id={headingId} className={styles.countingText}>
            Boletins chegando das seções de todo o país…
          </h1>
          <span className={styles.countingBar} aria-hidden="true">
            <span className={styles.countingFill} />
          </span>
        </article>
      )}

      <section className={styles.count} aria-label="Resultado da votação">
        {rows.map((row) => (
          <div key={row.key} className={styles.row} data-elected={row.elected || undefined}>
            <div className={styles.rowHead}>
              <span className={styles.rowName}>{row.name}</span>
              <span className={styles.rowShare}>{counted ? formatPercent(row.share) : "—"}</span>
            </div>
            <div className={styles.bar}>
              <span
                className={styles.barFill}
                style={{ width: counted ? `${row.share}%` : "0%" }}
              />
            </div>
            <p className={styles.rowDetail}>
              {row.detail}
              {counted ? ` · ${formatVotes(row.votes)} votos` : " · apurando"}
            </p>
          </div>
        ))}
      </section>

      {counted ? (
        <>
          <dl className={styles.facts}>
            <div>
              <dt>Margem</dt>
              <dd>{formatPercent(election.margin)}</dd>
            </div>
            <div>
              <dt>Comparecimento</dt>
              <dd>{formatPercent(election.turnout)}</dd>
            </div>
            <div>
              <dt>Votos válidos</dt>
              <dd>{formatVotes(election.validVotes)}</dd>
            </div>
            <div>
              <dt>Maior apoio</dt>
              <dd>{election.strongholds.join(" e ")}</dd>
            </div>
            <div>
              <dt>Base no Congresso</dt>
              <dd>{election.coalitionStrength} de 100</dd>
            </div>
            <div>
              <dt>Posse</dt>
              <dd>{defeated ? "Não haverá" : "Janeiro · Ano 1"}</dd>
            </div>
          </dl>

          <section
            className={styles.elected}
            aria-label={defeated ? "Candidatura derrotada" : "Presidência eleita"}
          >
            <p className={styles.electedLabel}>
              {defeated ? "Candidatura derrotada" : "Presidência eleita"}
            </p>
            <p className={styles.electedName}>
              {defeated ? election.opponent.name : candidate.name}
            </p>
            <p className={styles.electedDetail}>
              {defeated
                ? `${election.opponent.party} · a Presidência ficou com a oposição`
                : `${candidate.treatment.label} · ${candidate.origin.label} · ${candidate.promise.label}`}
            </p>
          </section>

          <div className={styles.actions}>
            <button
              ref={proceedRef}
              type="button"
              className={`btn btn--primary ${styles.proceed}`}
              onClick={onProceed}
            >
              {defeated ? "Disputar outra eleição" : "Receber o diploma e seguir para a posse"}
            </button>
          </div>
        </>
      ) : null}
    </main>
  );
}
