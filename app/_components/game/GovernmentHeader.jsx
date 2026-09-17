import { BrandMark } from "@/app/_components/brand/BrandMark";
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
      {/* The game's own mark, then the country being governed, then the office held. Three
          identities that must not be read as one: the emblem is Decretum, the flag is Brazil. */}
      <div className={styles.brand}>
        <BrandMark variant="header" />
        <span className={styles.wordmark}>Decretum</span>
      </div>
      <span className={styles.divider} aria-hidden="true" />
      <div className={styles.identity}>
        <CountryFlag code={country?.code} />
        <p className={styles.country}>{country?.name}</p>
      </div>
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
