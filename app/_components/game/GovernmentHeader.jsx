import { formatDossierDate, formatShortCalendar, padTurn } from "@/app/_lib/text";
import { CountryFlag } from "./CountryFlag";
import styles from "./GovernmentHeader.module.css";

export function GovernmentHeader({
  country,
  officeTitle,
  calendar,
  turn,
  totalTurns,
  dimmed = false,
  onOpenChronicle,
  onOpenSettings,
}) {
  return (
    <header className={styles.header} data-dimmed={dimmed || undefined}>
      <CountryFlag code={country?.code} />
      <p className={styles.country}>{country?.name}</p>
      <span className={styles.divider} aria-hidden="true" />
      <p className={styles.office}>{officeTitle}</p>
      <span className={styles.spacer} />
      <p className={styles.date}>
        <span className={styles.dateLong}>
          {formatDossierDate(calendar)} · Mês {padTurn(turn)}/{totalTurns}
        </span>
        <span className={styles.dateShort} aria-hidden="true">
          {formatShortCalendar(calendar)}
        </span>
      </p>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" className={styles.textButton} onClick={onOpenChronicle}>
        Crônica
      </button>
      <button
        type="button"
        className={styles.iconButton}
        aria-label="Pausa e configurações"
        onClick={onOpenSettings}
      >
        <span className={styles.gear} aria-hidden="true" />
      </button>
    </header>
  );
}
