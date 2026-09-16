import { EMBLEM_PATHS } from "@/app/_components/game/emblems";
import styles from "./PresidentialSeal.module.css";

const PILLAR_ORDER = ["people", "market", "congress", "institutions"];

// "brass": title seal with marks around a dashed ring (design 2a).
// "wax": inauguration seal with the name above a row of marks (design 2d).
// `size` is set inline because it has to beat the module's own default from any other stylesheet.
export function PresidentialSeal({ variant = "brass", size = null }) {
  return (
    <div
      className={styles.seal}
      data-variant={variant}
      style={size ? { "--seal-size": `${size}px` } : undefined}
      aria-hidden="true"
    >
      <span className={styles.ring} />
      <span className={styles.label}>{variant === "wax" ? "Decretum" : "S·P·S·L"}</span>
      {variant === "wax" ? <span className={styles.rule} /> : null}
      <span className={styles.marks}>
        {PILLAR_ORDER.map((pillar) => (
          <svg key={pillar} className={styles.mark} data-pillar={pillar} viewBox="0 0 40 40">
            <path d={EMBLEM_PATHS[pillar]} />
          </svg>
        ))}
      </span>
    </div>
  );
}
