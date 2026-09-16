import { padTurn } from "@/app/_lib/text";
import styles from "./MandateTimeline.module.css";

export function MandateTimeline({ turn, totalTurns, hint = null }) {
  return (
    <footer className={styles.timeline}>
      <div className={styles.labels}>
        <span>Mandato · {totalTurns} meses</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
        <span className={styles.current}>
          Mês {padTurn(turn)} / {totalTurns}
        </span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-label="Progresso do mandato"
        aria-valuemin={1}
        aria-valuemax={totalTurns}
        aria-valuenow={turn}
        aria-valuetext={`Mês ${turn} de ${totalTurns}`}
      >
        {Array.from({ length: totalTurns }, (_, index) => {
          const month = index + 1;
          const state = month < turn ? "past" : month === turn ? "current" : "future";
          return <span key={month} className={styles.segment} data-state={state} />;
        })}
      </div>
    </footer>
  );
}
