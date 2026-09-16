import styles from "./CountryFlag.module.css";

// Geometric flag of the fictional República de Aurória (heraldic green is reserved for flags).
export function CountryFlag() {
  return (
    <span className={styles.flag} aria-hidden="true">
      <span className={styles.band} />
      <span className={styles.disc} />
    </span>
  );
}
