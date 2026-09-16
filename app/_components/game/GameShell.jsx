import styles from "./GameShell.module.css";

// Full-screen office atmosphere with layout slots. The background is decorative only.
export function GameShell({
  header,
  powers,
  footer,
  previewSide = null,
  scrollable = false,
  children,
}) {
  return (
    <div
      className={styles.shell}
      data-preview={previewSide ?? undefined}
      data-scrollable={scrollable || undefined}
    >
      <div className={styles.atmosphere} aria-hidden="true">
        <div className={styles.window} />
        <div className={`${styles.curtain} ${styles.curtainLeft}`} />
        <div className={`${styles.curtain} ${styles.curtainRight}`} />
        <div className={styles.desk} />
        <div className={styles.glow} />
        <div className={styles.vignette} />
      </div>
      {header ? <div className={styles.header}>{header}</div> : null}
      {powers ? <div className={styles.powers}>{powers}</div> : null}
      <div className={styles.stage}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
