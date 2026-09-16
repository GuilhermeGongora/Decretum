import styles from "./OfficialStamp.module.css";

// Decorative seal. Its words are always also present as readable text elsewhere.
export function OfficialStamp({
  variant = "deferred",
  heading,
  lines = [],
  className = "",
  ...rest
}) {
  return (
    <div className={`${styles.stamp} ${styles[variant]} ${className}`} aria-hidden="true" {...rest}>
      <span className={styles.heading}>{heading}</span>
      <span className={styles.rule} />
      {lines.map((line) => (
        <span key={line} className={styles.line}>
          {line}
        </span>
      ))}
    </div>
  );
}
