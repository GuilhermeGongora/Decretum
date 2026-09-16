"use client";

import { useId } from "react";
import { PILLARS, describeEffects, formatDelta, trendArrows, trendWord } from "@/app/_lib/text";
import styles from "./DecisionChoice.module.css";

// Pointer focus must not open the preview: the panel would grow under the cursor and swallow the click.
function isKeyboardFocus(element) {
  try {
    return element.matches(":focus-visible");
  } catch {
    return true;
  }
}

const SIDE_TEXT = {
  left: { arrow: "←", direction: "esquerda" },
  right: { arrow: "→", direction: "direita" },
};

function TrendRows({ effects, exactEffects }) {
  const affected = PILLARS.filter(({ key }) => effects[key].strength > 0);
  if (affected.length === 0) return <p className={styles.noEffect}>Sem impacto aparente.</p>;

  return (
    <ul className={styles.trendRows}>
      {affected.map(({ key, name }) => {
        const effect = effects[key];
        return (
          <li
            key={key}
            className={styles.trendRow}
            data-direction={effect.direction}
            data-strength={effect.strength}
          >
            <span className={styles.trendName}>{name}</span>
            <span className={styles.trendValue}>
              {exactEffects ? formatDelta(effect.delta) : trendWord(effect)} {trendArrows(effect)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// state: "rest" | "target" (previewed) | "opposite" (the other side is previewed)
export function DecisionChoice({
  side,
  choice,
  state,
  busy,
  exactEffects,
  buttonRef,
  onChoose,
  onPreview,
}) {
  const descriptionId = useId();
  const { arrow, direction } = SIDE_TEXT[side];
  const isTarget = state === "target";

  return (
    <section className={styles.panel} data-side={side} data-state={state}>
      <div className={styles.keyRow}>
        <span className={styles.keycap} aria-hidden="true">
          {arrow}
        </span>
        <span className={styles.hint}>{isTarget ? "Prévia" : `Arrastar à ${direction}`}</span>
      </div>
      <h3 className={styles.title}>{choice.label}</h3>
      <span className={styles.rule} aria-hidden="true" />

      {isTarget ? (
        <>
          <p className={styles.trendsLabel}>Tendências esperadas</p>
          <TrendRows effects={choice.effects} exactEffects={exactEffects} />
          <p className={styles.note}>
            Nada foi assinado. Solte o dossiê ou pressione <strong>Enter</strong> para confirmar.
          </p>
        </>
      ) : null}

      <button
        ref={buttonRef}
        type="button"
        className={styles.chooseButton}
        disabled={busy}
        aria-label={`Escolher: ${choice.label}`}
        aria-describedby={descriptionId}
        onClick={() => onChoose(side)}
        onFocus={(event) => {
          if (isKeyboardFocus(event.currentTarget)) onPreview(side);
        }}
      >
        <span className={styles.buttonArrow} aria-hidden="true">
          {arrow}
        </span>
        <span className={styles.buttonChoice} aria-hidden="true">
          {choice.label}
        </span>
        <span className={styles.buttonText}>Escolher esta</span>
      </button>
      <p id={descriptionId} className="visually-hidden">
        {describeEffects(choice.effects, exactEffects)}
      </p>
    </section>
  );
}
