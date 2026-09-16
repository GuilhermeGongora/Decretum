import { CountryFlag } from "./CountryFlag";
import styles from "./DossierTopBar.module.css";

// Thin top line used by the briefing and ending screens (design 2c).
export function DossierTopBar({ country, kicker, phase }) {
  return (
    <div className={styles.bar}>
      <CountryFlag code={country?.code} />
      <span className={styles.country}>{country?.name}</span>
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.kicker}>{kicker}</span>
      <span className={styles.spacer} />
      <span className={styles.phase}>{phase}</span>
    </div>
  );
}
