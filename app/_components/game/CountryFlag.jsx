import styles from "./CountryFlag.module.css";

// Geometric mark of a country, not a reproduction of its flag. Decorative: the country name is always
// written next to it.
export function CountryFlag({ code = "BR" }) {
  return (
    <span className={styles.flag} data-code={code} aria-hidden="true">
      <span className={styles.field} />
      <span className={styles.mark} />
    </span>
  );
}
