"use client";

import { useEffect, useId, useRef } from "react";
import { formatDossierDate, padTurn } from "@/app/_lib/text";
import styles from "./ConstitutionalPanel.module.css";

// The dossier of the process itself: what is being alleged, who decides it next, how the houses are
// expected to divide, and what has already happened. Everything here comes from the server's public
// view — no count is made in the browser, and the numbers the outcome is computed from never arrive.

// Where each stage stands, read from the stage the process is at. The country declares the stages,
// so the chain below is whatever that country's constitution says it is.
function stageStates(stages, procedure) {
  const current = stages.findIndex((stage) => stage.key === procedure.stage.key);
  const resolved = procedure.status !== "active";
  // A process that ended before the last stage was interrupted rather than completed.
  const reached = current >= 0 ? current : stages.length;

  return stages.map((stage, index) => {
    if (index < reached) return { ...stage, state: "done" };
    if (index === reached && !resolved) return { ...stage, state: "current" };
    if (resolved && index >= reached) return { ...stage, state: "interrupted" };
    return { ...stage, state: "future" };
  });
}

function HouseReading({ house, label }) {
  if (!house) return null;
  const confirmed = house.votes !== null && house.votes !== undefined;

  return (
    <div className={styles.house}>
      <p className={styles.houseName}>{house.name}</p>
      <p className={styles.quorum}>
        <span className={styles.quorumLabel}>{label}</span>
        <span className={styles.quorumValue}>
          {house.threshold} de {house.seats}
        </span>
      </p>
      {confirmed ? (
        <p className={styles.count} data-confirmed="true">
          <span className={styles.countValue}>{house.votes}</span>
          <span className={styles.countUnit}>votos apurados</span>
        </p>
      ) : house.estimate ? (
        <p className={styles.count}>
          <span className={styles.countValue}>
            {house.estimate.low}–{house.estimate.high}
          </span>
          <span className={styles.countUnit}>projeção de votos favoráveis</span>
        </p>
      ) : (
        <p className={styles.count}>
          <span className={styles.countUnit}>Sem votação prevista nesta etapa</span>
        </p>
      )}
    </div>
  );
}

export function ConstitutionalPanel({ procedure, stages = [], onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  // A government whose process was never opened, or a save from before the chain existed.
  if (!procedure) {
    return (
      <dialog ref={dialogRef} className={styles.panel} aria-labelledby={titleId}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            Processo constitucional
          </h2>
          <button type="button" className={styles.close} onClick={onClose}>
            Fechar
          </button>
        </header>
        <div className={styles.body}>
          <p className={styles.empty}>
            Nenhum processo corre contra esta Presidência. O arquivo permanece aberto.
          </p>
        </div>
      </dialog>
    );
  }

  const timeline = stageStates(stages, procedure);
  const senateStage = ["senate_admissibility", "suspended", "senate_trial"].includes(
    procedure.stage.key,
  );
  const suspended = procedure.presidency.key === "suspended";

  return (
    <dialog
      ref={dialogRef}
      className={styles.panel}
      aria-labelledby={titleId}
      data-suspended={suspended || undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            Processo constitucional
          </h2>
          <p className={styles.meta}>
            Aberto em {formatDossierDate(procedure.calendar)} · Mês{" "}
            {padTurn(procedure.openedAtTurn)}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          Fechar
        </button>
      </header>

      <div className={styles.body}>
        <section className={styles.standing} aria-label="Situação">
          <p className={styles.presidency} data-state={procedure.presidency.key}>
            {procedure.presidency.label}
          </p>
          <p className={styles.institution}>
            <span className={styles.fieldLabel}>Instituição responsável</span>
            {procedure.institution}
          </p>
          <p className={styles.institution}>
            <span className={styles.fieldLabel}>Etapa</span>
            {procedure.stage.label}
          </p>
          {procedure.nextMilestone ? (
            <p className={styles.institution}>
              <span className={styles.fieldLabel}>Próximo marco</span>
              {procedure.nextMilestone.label}
            </p>
          ) : null}
          {procedure.resolutionLabel ? (
            <p className={styles.institution}>
              <span className={styles.fieldLabel}>Resolução</span>
              {procedure.resolutionLabel}
            </p>
          ) : null}
          {suspended && procedure.turnsLeft !== null ? (
            <p className={styles.deadline}>
              <span className={styles.fieldLabel}>Prazo do afastamento</span>
              {procedure.turnsLeft} meses
            </p>
          ) : null}
        </section>

        <section className={styles.accusation} aria-label="Acusação">
          <p className={styles.fieldLabel}>Acusação</p>
          <p className={styles.evidence}>
            Evidências públicas: <strong>{procedure.accusation.level.label}</strong>
          </p>
          {procedure.accusation.grounds.length > 0 ? (
            <ul className={styles.grounds}>
              {procedure.accusation.grounds.map((ground) => (
                <li key={ground.key}>{ground.label}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className={styles.houses} aria-label="Quórum constitucional">
          <HouseReading house={procedure.chamber} label="Autorização" />
          <HouseReading
            house={procedure.senate}
            label={
              senateStage && procedure.stage.key === "senate_trial" ? "Condenação" : "Instauração"
            }
          />
        </section>

        <section aria-labelledby={`${titleId}-chain`}>
          <h3 id={`${titleId}-chain`} className={styles.fieldLabel}>
            Andamento
          </h3>
          <ol className={styles.timeline}>
            {timeline.map((stage) => (
              <li key={stage.key} className={styles.step} data-state={stage.state}>
                <span className={styles.stepMark} aria-hidden="true" />
                <span className={styles.stepLabel}>{stage.label}</span>
                {stage.note ? <span className={styles.stepNote}>{stage.note}</span> : null}
              </li>
            ))}
          </ol>
        </section>

        {procedure.timeline.length > 0 ? (
          <section aria-labelledby={`${titleId}-record`}>
            <h3 id={`${titleId}-record`} className={styles.fieldLabel}>
              Registro
            </h3>
            <ol className={styles.record}>
              {procedure.timeline.map((entry, index) => (
                <li key={`${entry.turn}-${entry.stage}-${index}`}>
                  <span className={styles.recordTurn}>
                    {formatDossierDate(entry.calendar)} · Mês {padTurn(entry.turn)}
                  </span>
                  {entry.note ? <span className={styles.recordNote}>{entry.note}</span> : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </dialog>
  );
}
