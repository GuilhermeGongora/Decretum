import { useId } from "react";
import { CountryFlag } from "@/app/_components/game/CountryFlag";
import styles from "./CountrySelectScreen.module.css";

function Dossier({ country, pending, onSelect }) {
  const headingId = useId();
  const termYears = Math.round(country.office.termMonths / 12);

  return (
    <li>
      <article
        className={styles.dossier}
        data-playable={country.playable || undefined}
        aria-labelledby={headingId}
      >
        <header className={styles.head}>
          <CountryFlag code={country.code} />
          <p className={styles.kicker}>Dossiê institucional</p>
        </header>

        <h2 id={headingId} className={styles.name}>
          {country.name}
        </h2>
        <p className={styles.longName}>{country.longName}</p>
        <p className={styles.summary}>{country.summary}</p>

        <dl className={styles.facts}>
          <div>
            <dt>Cargo</dt>
            <dd>{country.office.title}</dd>
          </div>
          <div>
            <dt>Mandato</dt>
            <dd>
              {termYears} anos · {country.office.termMonths} meses
            </dd>
          </div>
          <div>
            <dt>Legislativo</dt>
            <dd>{country.legislature?.name ?? "—"}</dd>
          </div>
          <div>
            <dt>Corte constitucional</dt>
            <dd>{country.powers?.supremeCourt?.name ?? "—"}</dd>
          </div>
        </dl>

        {country.playable ? (
          <button
            type="button"
            className={`btn btn--primary ${styles.action}`}
            onClick={() => onSelect(country.code)}
            disabled={pending}
          >
            Concorrer {country.name === "Brasil" ? "no Brasil" : `em ${country.name}`}
          </button>
        ) : (
          <div className={styles.sealed}>
            <span className={styles.seal} aria-hidden="true">
              Lacrado
            </span>
            <p className={styles.sealedText}>
              <strong>Em desenvolvimento</strong>
              <span>{country.developmentNote ?? "Pacote institucional em preparação."}</span>
            </p>
          </div>
        )}
      </article>
    </li>
  );
}

// Country selection by institutional dossier (playbook §3.3, phase A): the playable pack is an open
// file on the desk, the others are still sealed and cannot start a government.
export function CountrySelectScreen({ countries, loading, pending, error, onSelect, onBack }) {
  const headingId = useId();

  return (
    <main className={styles.screen} aria-labelledby={headingId}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Arquivo constitucional · Seleção</p>
        <h1 id={headingId} className={styles.title}>
          Qual república você aceita governar?
        </h1>
        <p className={styles.lead}>
          Cada país traz instituições próprias: quem aprova as leis, quem julga os atos do governo e
          o que é preciso para derrubar uma Presidência.
        </p>
      </div>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className={styles.loading} role="status">
          Consultando o arquivo de países…
        </p>
      ) : (
        <ul className={styles.list}>
          {countries.map((country) => (
            <Dossier key={country.code} country={country} pending={pending} onSelect={onSelect} />
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <button type="button" className="btn" onClick={onBack}>
          Voltar
        </button>
      </div>
    </main>
  );
}
