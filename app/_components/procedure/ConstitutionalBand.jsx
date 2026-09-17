import styles from "./ConstitutionalBand.module.css";

// The one permanent sign that a constitutional process is running against this government.
//
// It appears only once the process is public: while the risk is still internal, the player is told
// through the cards and the chronicle, never through a meter. A band that appeared at the first
// suspicion would turn a political rumour into a scoreboard.
//
// It is a button, because it opens the full dossier. It carries no number: the stage it names and
// the milestone it points at are the whole of it.
export function ConstitutionalBand({ procedure, onOpen }) {
  if (!procedure || procedure.status !== "active") return null;
  // Grounds are still being gathered: nothing has been filed, so there is nothing public to show.
  if (procedure.stage.key === "grounds_emerging") return null;

  const suspended = procedure.presidency.key === "suspended";
  const milestone = procedure.nextMilestone?.label ?? null;
  const label = suspended ? "Presidência afastada" : "Processo constitucional";
  // While the presidency is suspended the stage carries the same name as the band, and announcing
  // both would read as "Presidência afastada: Presidência afastada" to a screen reader.
  const announced =
    procedure.stage.label && procedure.stage.label !== label
      ? `${label}: ${procedure.stage.label}.`
      : `${label}.`;

  return (
    <button
      type="button"
      className={styles.band}
      data-suspended={suspended || undefined}
      onClick={onOpen}
      aria-label={`${announced} Abrir o painel do processo.`}
    >
      <span className={styles.mark} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.stage}>{procedure.stage.label}</span>
      {milestone ? (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.milestone}>
            <span className={styles.milestoneLabel}>Próximo</span> {milestone}
          </span>
        </>
      ) : null}
      <span className={styles.open} aria-hidden="true">
        Abrir
      </span>
    </button>
  );
}
