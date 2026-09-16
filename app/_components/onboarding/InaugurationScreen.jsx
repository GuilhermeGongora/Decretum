"use client";

import { useEffect, useId, useRef } from "react";
import { GOVERNMENT_PROFILE, officeTitle } from "@/app/_lib/government";
import { MANDATE_TURNS } from "@/src/domain/constants";
import styles from "./InaugurationScreen.module.css";
import { PresidentialSeal } from "./PresidentialSeal";

// Inauguration ceremony (design 2d). "successor" shows the legacies of the finished government.
export function InaugurationScreen({
  mode = "new",
  legacyFlags = [],
  pending,
  error,
  onBack,
  onTakeOffice,
}) {
  const headingId = useId();
  const takeOfficeRef = useRef(null);
  const isSuccessor = mode === "successor";

  useEffect(() => {
    takeOfficeRef.current?.focus();
  }, []);

  return (
    <main className={styles.inauguration} aria-labelledby={headingId}>
      <p className={styles.kicker}>
        {isSuccessor ? "Transmissão de autoridade · Governo sucessor" : "Cerimônia de posse"}
      </p>
      <PresidentialSeal variant="wax" />
      <h1 id={headingId} className={styles.headline}>
        A Carta lhe concede autoridade. O país lhe cobrará consequências.
      </h1>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>País</dt>
          <dd>{GOVERNMENT_PROFILE.countryName}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Cargo</dt>
          <dd>{officeTitle("president")}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Posse</dt>
          <dd>Janeiro · Ano 1</dd>
        </div>
        <div className={styles.fact}>
          <dt>Mandato</dt>
          <dd>{MANDATE_TURNS} meses</dd>
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
        <p className={styles.oathText}>{GOVERNMENT_PROFILE.oath}</p>
        <div className={styles.signature} aria-hidden="true">
          <span className={styles.signatureLine}>
            <span className={styles.signatureRule} />
            Assinatura do Presidente
          </span>
          <span className={styles.pen} />
        </div>
      </article>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <div className={styles.buttons}>
          {onBack ? (
            <button type="button" className={`btn ${styles.back}`} onClick={onBack}>
              Voltar
            </button>
          ) : null}
          <button
            ref={takeOfficeRef}
            type="button"
            className={`btn btn--primary ${styles.takeOffice}`}
            onClick={onTakeOffice}
            disabled={pending}
          >
            {pending ? "Firmando o termo…" : "Tomar posse"}
          </button>
        </div>
        <p className={styles.hint}>Enter ou espaço firmam o termo</p>
      </div>
    </main>
  );
}
