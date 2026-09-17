import { AtmosphericParticles } from "./AtmosphericParticles";
import { CursorGlow } from "./CursorGlow";
import styles from "./Scene.module.css";

// Atmosphere layer for a screen: one low-poly scene behind the content, with a protection gradient so
// text contrast never depends on the artwork. Decorative by definition — the layer is aria-hidden and
// every scene has a navy fallback, so a missing or blocked image changes nothing but the mood.
//
// Each scene carries its own light and dust: quieter where the screen is dense with reading (the
// archive dossiers, the count), fuller where the artwork is the subject (home, debate, ceremony).
// Paint order inside the layer is image → light → dust → veil, so the veil always wins on contrast.
const SCENES = {
  home: {
    focus: "72% 42%",
    mobileFocus: "62% 34%",
    glow: "normal",
    particles: "normal",
  },
  archive: {
    focus: "50% 58%",
    mobileFocus: "50% 52%",
    glow: "soft",
    particles: "sparse",
  },
  debate: {
    focus: "50% 42%",
    mobileFocus: "50% 38%",
    glow: "normal",
    particles: "normal",
  },
  count: {
    focus: "62% 46%",
    mobileFocus: "58% 40%",
    glow: "soft",
    particles: "sparse",
  },
  ceremony: {
    focus: "50% 58%",
    mobileFocus: "50% 62%",
    glow: "normal",
    particles: "normal",
  },
  // The mandate: the office at night with the Congress beyond the glass. The screen is for reading
  // and for deciding, so the light and the dust stay at their quietest here.
  decision: {
    focus: "50% 46%",
    mobileFocus: "50% 38%",
    glow: "soft",
    particles: "sparse",
  },
};

export function Scene({ name, intensity = "normal", focus, priority = false, glow, particles }) {
  const scene = SCENES[name];
  if (!scene) return null;

  return (
    <div className={styles.scene} data-intensity={intensity} data-scene={name} aria-hidden="true">
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet={`/assets/scenes/${name}-mobile.webp`}
          width="900"
          height="1599"
        />
        <img
          className={styles.image}
          src={`/assets/scenes/${name}-desktop.webp`}
          alt=""
          width="1600"
          height="900"
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          style={focus ? { objectPosition: focus } : undefined}
          data-focus={scene.focus}
          data-mobile-focus={scene.mobileFocus}
        />
      </picture>
      <CursorGlow intensity={glow ?? scene.glow} />
      <AtmosphericParticles intensity={particles ?? scene.particles} />
      <div className={styles.veil} />
    </div>
  );
}
