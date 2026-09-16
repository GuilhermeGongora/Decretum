import { GOVERNMENT_PROFILE } from "@/app/_lib/government";
import { CountryFlag } from "./CountryFlag";
import styles from "./DossierTopBar.module.css";

// Thin top line used by the briefing and ending screens (design 2c).
export function DossierTopBar({ kicker, phase }) {
  return (
    <div className={styles.bar}>
      <CountryFlag />
      <span className={styles.country}>{GOVERNMENT_PROFILE.countryName}</span>
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.kicker}>{kicker}</span>
      <span className={styles.spacer} />
      <span className={styles.phase}>{phase}</span>
    </div>
  );
}
