"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./InaugurationScreen.module.css";
import { PresidentialSeal } from "./PresidentialSeal";

const SIGNING_MS = 1100;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The signature is drawn at runtime from the name the player registered: the hand is a self-hosted
// font, the ink is real SVG text, and `textLength` keeps a long name inside the paper.
function Signature({ name, office, state }) {
  const fitted = Math.min(488, Math.max(180, name.length * 26));

  return (
    <figure className={styles.signature} data-state={state}>
      <span className={styles.signatureInk}>
        <svg
          viewBox="0 0 520 120"
          className={styles.signatureSvg}
          role="img"
          aria-label={`Assinatura de ${name}`}
        >
          <text
            x="16"
            y="84"
            className={styles.signatureText}
            textLength={fitted}
            lengthAdjust="spacingAndGlyphs"
          >
            {name}
          </text>
        </svg>
      </span>
      <span className={styles.signatureRule} aria-hidden="true" />
      <figcaption className={styles.signatureCaption}>
        {name} · {office}
      </figcaption>
    </figure>
  );
}

// Inauguration ceremony (design 2d). "successor" shows the legacies of the finished government; an
// elected president signs the oath of the country that elected them.
export function InaugurationScreen({
  country,
  candidate = null,
  election = null,
  mode = "new",
  legacyFlags = [],
  pending,
  error,
  reducedMotion = false,
  onBack,
  onTakeOffice,
}) {
  const headingId = useId();
  const takeOfficeRef = useRef(null);
  const signingRef = useRef(false);
  const [state, setState] = useState("idle");
  const isSuccessor = mode === "successor";
  const signatoryName = candidate?.name ?? country.office.title;
  const busy = pending || state !== "idle";

  useEffect(() => {
    takeOfficeRef.current?.focus();
  }, []);

  // One signature per click, whatever the browser does with a double tap.
  async function sign() {
    if (signingRef.current) return;
    signingRef.current = true;
    setState("signing");
    try {
      if (!reducedMotion) await wait(SIGNING_MS);
      setState("signed");
      // The briefing only opens after the government is confirmed by whoever owns that promise.
      await onTakeOffice();
    } finally {
      signingRef.current = false;
    }
  }

  return (
    <main className={styles.inauguration} aria-labelledby={headingId}>
      <p className={styles.kicker}>
        {isSuccessor ? "Transmissão de autoridade · Governo sucessor" : "Cerimônia de posse"}
      </p>
      <PresidentialSeal variant="wax" size={112} />
      <h1 id={headingId} className={styles.headline}>
        A Constituição lhe concede autoridade. O país lhe cobrará consequências.
      </h1>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>País</dt>
          <dd>{country.name}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Cargo</dt>
          <dd>{country.office.title}</dd>
        </div>
        {candidate ? (
          <div className={styles.fact}>
            <dt>Empossado</dt>
            <dd>
              {candidate.name} · {candidate.party.acronym}
            </dd>
          </div>
        ) : null}
        {election ? (
          <div className={styles.fact}>
            <dt>Eleito com</dt>
            <dd>{election.share.toFixed(1).replace(".", ",")}% dos válidos</dd>
          </div>
        ) : null}
        <div className={styles.fact}>
          <dt>Posse</dt>
          <dd>Janeiro · Ano 1</dd>
        </div>
      </dl>

      {isSuccessor ? (
        <section className={styles.legacy} aria-labelledby={`${headingId}-legacy`}>
          <h2 id={`${headingId}-legacy`} className={styles.legacyLabel}>
            Legados do governo anterior
          </h2>
          {legacyFlags.length > 0 ? (
            <>
              <p className={styles.legacyNote}>
                Até cinco destes legados passam ao sucessor e ajustam o ponto de partida dos
                pilares; os demais permanecem apenas na crônica.
              </p>
              <ul className={styles.legacyList}>
                {legacyFlags.map((flag) => (
                  <li key={flag.key}>{flag.label}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.legacyNote}>
              O governo anterior não deixou legados. O sucessor começa sem heranças.
            </p>
          )}
        </section>
      ) : null}

      <article className={styles.oath}>
        <p className={styles.oathLabel}>Termo de posse</p>
        <p className={styles.oathText}>{country.oath}</p>
        <Signature name={signatoryName} office={country.office.title} state={state} />
      </article>

      <p className="visually-hidden" role="status">
        {state === "signed" ? `Termo assinado por ${signatoryName}.` : ""}
      </p>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <div className={styles.buttons}>
          {onBack ? (
            <button type="button" className={`btn ${styles.back}`} onClick={onBack} disabled={busy}>
              Voltar
            </button>
          ) : null}
          <button
            ref={takeOfficeRef}
            type="button"
            className={`btn btn--primary ${styles.takeOffice}`}
            onClick={sign}
            disabled={busy}
          >
            {busy ? "Firmando o termo…" : "Tomar posse"}
          </button>
        </div>
        <p className={styles.hint}>Enter ou espaço firmam o termo</p>
      </div>
    </main>
  );
}
