import styles from "./AtmosphericParticles.module.css";

// Dust hanging in an institutional room, not stars or snow. The definition is a fixed list — never
// random — so the server and the client render the same thing and a rerender changes nothing.
//
// Positions favour the top and the right, where the artwork keeps its light sources; the contrast
// veil sits above this layer, so the dust almost disappears over the reading column.
const DUST = [
  { x: 12, y: 18, size: 2, alpha: 0.16, duration: 104, delay: -18, drift: 14, tone: "brass" },
  { x: 26, y: 62, size: 1, alpha: 0.1, duration: 128, delay: -64, drift: -10, tone: "ivory" },
  { x: 38, y: 30, size: 2, alpha: 0.12, duration: 92, delay: -31, drift: 9, tone: "navy" },
  { x: 47, y: 74, size: 1, alpha: 0.08, duration: 136, delay: -102, drift: 12, tone: "brass" },
  { x: 55, y: 14, size: 3, alpha: 0.2, duration: 76, delay: -7, drift: -16, tone: "brass" },
  { x: 61, y: 46, size: 1, alpha: 0.09, duration: 118, delay: -55, drift: 11, tone: "ivory" },
  { x: 68, y: 24, size: 2, alpha: 0.18, duration: 88, delay: -40, drift: -8, tone: "ivory" },
  { x: 74, y: 68, size: 1, alpha: 0.07, duration: 132, delay: -88, drift: 15, tone: "navy" },
  { x: 79, y: 36, size: 2, alpha: 0.17, duration: 96, delay: -23, drift: -12, tone: "brass" },
  { x: 84, y: 12, size: 1, alpha: 0.11, duration: 112, delay: -70, drift: 7, tone: "ivory" },
  { x: 88, y: 54, size: 3, alpha: 0.19, duration: 68, delay: -14, drift: -13, tone: "brass" },
  { x: 92, y: 28, size: 1, alpha: 0.09, duration: 124, delay: -96, drift: 10, tone: "navy" },
  { x: 18, y: 42, size: 1, alpha: 0.07, duration: 140, delay: -47, drift: -9, tone: "ivory" },
  { x: 33, y: 86, size: 2, alpha: 0.12, duration: 100, delay: -77, drift: 13, tone: "brass" },
  { x: 52, y: 58, size: 1, alpha: 0.06, duration: 134, delay: -29, drift: -11, tone: "navy" },
  { x: 65, y: 82, size: 2, alpha: 0.13, duration: 84, delay: -61, drift: 8, tone: "ivory" },
  { x: 71, y: 8, size: 1, alpha: 0.1, duration: 120, delay: -35, drift: -14, tone: "brass" },
  { x: 96, y: 70, size: 2, alpha: 0.15, duration: 108, delay: -83, drift: 12, tone: "ivory" },
];

export function AtmosphericParticles({ intensity = "normal" }) {
  if (intensity === "off") return null;

  return (
    <div
      className={styles.field}
      data-layer="particles"
      data-intensity={intensity}
      aria-hidden="true"
    >
      {DUST.map((mote, index) => (
        <span
          key={`${mote.x}-${mote.y}-${index}`}
          className={styles.mote}
          data-tone={mote.tone}
          style={{
            "--x": `${mote.x}%`,
            "--y": `${mote.y}%`,
            "--size": `${mote.size}px`,
            "--alpha": mote.alpha,
            "--duration": `${mote.duration}s`,
            "--delay": `${mote.delay}s`,
            "--drift": `${mote.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
