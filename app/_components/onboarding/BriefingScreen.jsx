import { useId } from "react";
import { EMBLEM_PATHS } from "@/app/_components/game/emblems";
import { DossierTopBar } from "@/app/_components/game/DossierTopBar";
import { OfficialStamp } from "@/app/_components/game/OfficialStamp";
import { GOVERNMENT_PROFILE, officeTitle } from "@/app/_lib/government";
import { PILLARS } from "@/app/_lib/text";
import { MANDATE_TURNS } from "@/src/domain/constants";
import styles from "./BriefingScreen.module.css";

// Pre-mandate state dossier (design 2c), with Aurória's institutions from GDD §4.
export function BriefingScreen({ onBack, onProceed }) {
  const headingId = useId();
  const profile = GOVERNMENT_PROFILE;

  return (
    <main className={styles.briefing} aria-labelledby={headingId}>
      <DossierTopBar kicker="Dossiê de Estado · Confidencial" phase="Pré-mandato" />

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
            {profile.countryLongName}
          </h1>
          <dl className={styles.facts}>
            <div>
              <dt>Cargo</dt>
              <dd>{officeTitle("president")}</dd>
            </div>
            <div>
              <dt>Sistema</dt>
              <dd>{profile.system}</dd>
            </div>
            <div>
              <dt>Mandato</dt>
              <dd>
                {MANDATE_TURNS / 12} anos · {MANDATE_TURNS} meses
              </dd>
            </div>
            <div>
              <dt>Sede</dt>
              <dd>{profile.headquarters}</dd>
            </div>
            <div>
              <dt>Legislativo</dt>
              <dd>{profile.legislature}</dd>
            </div>
            <div>
              <dt>Corte constitucional</dt>
              <dd>{profile.constitutionalCourt}</dd>
            </div>
          </dl>
          <p className={styles.sectionLabel}>Resumo institucional</p>
          <p className={styles.summary}>{profile.summary}</p>
          <ul className={styles.institutions}>
            {profile.institutions.map((institution) => (
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
                <span className={styles.pillarName}>{pillar.name}</span>
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
        <button type="button" className={`btn ${styles.action}`} onClick={onBack}>
          Voltar
        </button>
        <button
          type="button"
          className={`btn btn--primary ${styles.action} ${styles.proceed}`}
          onClick={onProceed}
        >
          Prosseguir para a posse
        </button>
      </div>
    </main>
  );
}
