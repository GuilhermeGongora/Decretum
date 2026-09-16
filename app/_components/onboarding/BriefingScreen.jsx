import { useId } from "react";
import { DossierTopBar } from "@/app/_components/game/DossierTopBar";
import { EMBLEM_PATHS } from "@/app/_components/game/emblems";
import { OfficialStamp } from "@/app/_components/game/OfficialStamp";
import { PILLARS } from "@/app/_lib/text";
import styles from "./BriefingScreen.module.css";

// First presidential briefing, read after the oath: the institutions the government will negotiate
// with, and the four forces it depends on. Everything here is a label from the country pack.
export function BriefingScreen({ country, onBack, onProceed }) {
  const headingId = useId();
  const { powers, office } = country;

  const institutions = [
    { name: office.headquarters, role: "sede da Presidência" },
    { name: powers.lowerHouse.name, role: `${powers.lowerHouse.seats} deputados` },
    { name: powers.upperHouse.name, role: `${powers.upperHouse.seats} senadores` },
    {
      name: powers.supremeCourt.name,
      role: `${powers.supremeCourt.justices} ministros · fora do gabinete`,
    },
    { name: powers.federation.name, role: `${powers.federation.units} unidades federativas` },
    ...country.keyMinistries.slice(0, 3).map(({ name, note }) => ({ name, role: note })),
  ];

  return (
    <main className={styles.briefing} aria-labelledby={headingId}>
      <DossierTopBar
        country={country}
        kicker="Briefing presidencial · Confidencial"
        phase="Primeiro dia"
      />

      <div className={styles.columns}>
        <article className={styles.document}>
          <OfficialStamp
            variant="verified"
            heading="Arquivo"
            lines={["Verificado"]}
            className={styles.stamp}
          />
          <p className={styles.eyebrow}>Ficha institucional</p>
          <h1 id={headingId} className={styles.name}>
            {country.longName}
          </h1>
          <dl className={styles.facts}>
            <div>
              <dt>Cargo</dt>
              <dd>{office.title}</dd>
            </div>
            <div>
              <dt>Sistema</dt>
              <dd>{country.system}</dd>
            </div>
            <div>
              <dt>Mandato</dt>
              <dd>
                {Math.round(office.termMonths / 12)} anos · {office.termMonths} meses
              </dd>
            </div>
            <div>
              <dt>Sede</dt>
              <dd>{office.headquarters}</dd>
            </div>
            <div>
              <dt>Legislativo</dt>
              <dd>{country.legislature.name}</dd>
            </div>
            <div>
              <dt>Corte constitucional</dt>
              <dd>{powers.supremeCourt.name}</dd>
            </div>
          </dl>
          <p className={styles.sectionLabel}>Resumo institucional</p>
          <p className={styles.summary}>{country.systemNote}</p>
          <ul className={styles.institutions}>
            {institutions.map((institution) => (
              <li key={institution.name}>
                <strong>{institution.name}</strong> — {institution.role}
              </li>
            ))}
          </ul>
        </article>

        <section className={styles.panel} aria-labelledby={`${headingId}-powers`}>
          <h2 id={`${headingId}-powers`} className={styles.panelLabel}>
            Os quatro poderes
          </h2>
          <p className={styles.panelIntro}>
            Os pilares medem influência e dependência, não aprovação. Cada decreto fortalece uma
            força e enfraquece outra.
          </p>
          <ul className={styles.pillars}>
            {PILLARS.map((pillar) => (
              <li key={pillar.key} className={styles.pillar}>
                <svg className={styles.pillarMark} viewBox="0 0 40 40" aria-hidden="true">
                  <path d={EMBLEM_PATHS[pillar.key]} />
                </svg>
                <span className={styles.pillarName}>{country.terminology.pillars[pillar.key]}</span>
                <span className={styles.pillarDescription}>{pillar.description}</span>
                <span className={styles.pillarRisks}>
                  Baixo: {pillar.risks.low} · Alto: {pillar.risks.high}
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.rule}>
            Zero destrói uma força; cem permite que ela domine o governo. Os dois extremos encerram
            o mandato.
          </p>
        </section>
      </div>

      <div className={styles.actions}>
        {onBack ? (
          <button type="button" className={`btn ${styles.action}`} onClick={onBack}>
            Voltar
          </button>
        ) : null}
        <button
          type="button"
          className={`btn btn--primary ${styles.action} ${styles.proceed}`}
          onClick={onProceed}
        >
          Abrir o primeiro dossiê
        </button>
      </div>
    </main>
  );
}
