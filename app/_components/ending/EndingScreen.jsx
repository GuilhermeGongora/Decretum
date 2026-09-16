import { useId } from "react";
import { DossierTopBar } from "@/app/_components/game/DossierTopBar";
import { OfficialStamp } from "@/app/_components/game/OfficialStamp";
import { PowerIndicators } from "@/app/_components/game/PowerIndicators";
import { formatDeltas, formatDossierDate, formatDuration, pillarName } from "@/app/_lib/text";
import styles from "./EndingScreen.module.css";

// End of government, built on the approved system (the 3f frame is missing from the export).
export function EndingScreen({
  snapshot,
  pending,
  error,
  onReadChronicle,
  onStartSuccessor,
  onBackToCover,
}) {
  const titleId = useId();
  const { game, ending, summary } = snapshot;
  const completed = game.mandateCompleted;

  return (
    <main className={styles.ending} aria-labelledby={titleId}>
      <DossierTopBar
        kicker={completed ? "Mandato concluído" : "Governo encerrado"}
        phase={formatDossierDate(game.calendar)}
      />

      <div className={styles.layout}>
        <article className={styles.document} data-kind={ending.kind}>
          <OfficialStamp
            variant="deferred"
            heading="República"
            lines={[completed ? "Cumprido" : "Encerrado"]}
            className={styles.stamp}
          />
          <p className={styles.eyebrow}>
            {completed ? "Mandato concluído" : "Fim do governo"} ·{" "}
            {formatDuration(summary.duration)}
          </p>
          <h1 id={titleId} className={styles.title}>
            {ending.title}
          </h1>
          <p className={styles.text}>{ending.text}</p>

          <dl className={styles.facts}>
            <div>
              <dt>Causa principal</dt>
              <dd>
                {summary.primaryMeter ? pillarName(summary.primaryMeter) : "Mandato cumprido"}
              </dd>
            </div>
            <div>
              <dt>Crises simultâneas</dt>
              <dd>
                {summary.simultaneousCrises.length > 0
                  ? summary.simultaneousCrises.map((crisis) => crisis.title).join(", ")
                  : "Nenhuma"}
              </dd>
            </div>
            <div>
              <dt>Duração</dt>
              <dd>{formatDuration(summary.duration)}</dd>
            </div>
            <div>
              <dt>Decisões</dt>
              <dd>{summary.decisionsCount}</dd>
            </div>
          </dl>
        </article>

        <aside className={styles.side}>
          <section className={styles.panel} aria-labelledby={`${titleId}-epithet`}>
            <h2 id={`${titleId}-epithet`} className={styles.panelLabel}>
              Título do governo
            </h2>
            <p className={styles.epithet}>{summary.epithet.title}</p>
            <p className={styles.score}>{summary.score.score} pontos</p>
          </section>

          <section className={styles.panel} aria-labelledby={`${titleId}-impact`}>
            <h2 id={`${titleId}-impact`} className={styles.panelLabel}>
              Decisões de maior impacto
            </h2>
            {summary.topDecisions.length > 0 ? (
              <ol className={styles.impactList}>
                {summary.topDecisions.map((decision) => (
                  <li key={decision.turn}>
                    <span className={styles.impactDate}>
                      {formatDossierDate(decision.calendar)}
                    </span>
                    <span className={styles.impactChoice}>{decision.choiceLabel}</span>
                    <span className={styles.impactMeta}>
                      {decision.speaker.name} · {formatDeltas(decision.deltas)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.empty}>Nenhuma decisão registrada.</p>
            )}
          </section>

          <section className={styles.panel} aria-labelledby={`${titleId}-legacy`}>
            <h2 id={`${titleId}-legacy`} className={styles.panelLabel}>
              Legados deste governo
            </h2>
            {summary.legacyFlags.length > 0 ? (
              <ul className={styles.legacyList}>
                {summary.legacyFlags.map((flag) => (
                  <li key={flag.key}>{flag.label}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>Nenhum legado foi marcado.</p>
            )}
          </section>
        </aside>
      </div>

      <section className={styles.powers}>
        <PowerIndicators meters={summary.finalMeters} label="Pilares ao fim do governo" />
      </section>

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button type="button" className={`btn ${styles.action}`} onClick={onReadChronicle}>
          Ler a crônica
        </button>
        <button
          type="button"
          className={`btn btn--primary ${styles.action} ${styles.successor}`}
          onClick={onStartSuccessor}
          disabled={pending}
        >
          Iniciar governo sucessor
        </button>
      </div>
      <button type="button" className="btn btn--link" onClick={onBackToCover}>
        Voltar à capa
      </button>
    </main>
  );
}
