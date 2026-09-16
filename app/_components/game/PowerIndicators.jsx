import { PILLARS } from "@/app/_lib/text";
import { PowerIndicator } from "./PowerIndicator";
import styles from "./PowerIndicators.module.css";

// `trends` are the server-resolved effects of the previewed choice; `deltas` the last applied effects.
export function PowerIndicators({
  meters,
  trends = null,
  deltas = null,
  label = "Pilares do poder",
}) {
  return (
    <section className={styles.strip} aria-label={label}>
      <ul className={styles.list}>
        {PILLARS.map((pillar) => (
          <PowerIndicator
            key={pillar.key}
            pillar={pillar}
            meter={meters[pillar.key]}
            trend={trends?.[pillar.key] ?? null}
            delta={deltas?.[pillar.key] ?? null}
          />
        ))}
      </ul>
    </section>
  );
}
