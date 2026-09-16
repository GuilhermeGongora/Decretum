import { AtmosphericParticles } from "@/app/_components/atmosphere/AtmosphericParticles";
import { CursorGlow } from "@/app/_components/atmosphere/CursorGlow";
import { Scene } from "@/app/_components/atmosphere/Scene";
import styles from "./GameShell.module.css";

// Layout slots plus one atmosphere. A screen either sits in a painted scene (`scene`) or in the
// office at midnight drawn in CSS; never both. Either way the background is decorative, and the
// light and dust stay quiet here: the mandate and the ending are screens for reading.
export function GameShell({
  header,
  powers,
  footer,
  scene = null,
  sceneIntensity = "normal",
  scenePriority = false,
  glow,
  particles,
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
      {scene ? (
        <Scene
          name={scene}
          intensity={sceneIntensity}
          priority={scenePriority}
          glow={glow}
          particles={particles}
        />
      ) : (
        <div className={styles.atmosphere} aria-hidden="true">
          <div className={styles.window} />
          <div className={`${styles.curtain} ${styles.curtainLeft}`} />
          <div className={`${styles.curtain} ${styles.curtainRight}`} />
          <div className={styles.desk} />
          <div className={styles.glow} />
          <CursorGlow intensity={glow ?? "soft"} />
          <AtmosphericParticles intensity={particles ?? "sparse"} />
          <div className={styles.vignette} />
        </div>
      )}
      {header ? <div className={styles.header}>{header}</div> : null}
      {powers ? <div className={styles.powers}>{powers}</div> : null}
      <div className={styles.stage}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
