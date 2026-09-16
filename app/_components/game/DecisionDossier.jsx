"use client";

import { categoryLabel, padTurn, shortVerb, signatureName } from "@/app/_lib/text";
import { CharacterPortrait } from "./CharacterPortrait";
import styles from "./DecisionDossier.module.css";
import { OfficialStamp } from "./OfficialStamp";

export function DecisionDossier({
  card,
  turn,
  calendar,
  previewSide,
  offset,
  dragging,
  leavingSide,
  reducedMotion,
  cardRef,
  headingId,
  helpId,
  pointerHandlers,
}) {
  const maxOffset = 190;
  const rotation = (offset / maxOffset) * 4;
  const style =
    leavingSide || reducedMotion
      ? undefined
      : { transform: `translateX(${offset}px) rotate(${rotation}deg)` };

  return (
    <article
      ref={cardRef}
      className={styles.dossier}
      tabIndex={0}
      aria-labelledby={headingId}
      aria-describedby={helpId}
      data-preview={previewSide ?? undefined}
      data-dragging={dragging || undefined}
      data-leaving={leavingSide ?? undefined}
      data-crisis={card.isCrisis || undefined}
      style={style}
      {...pointerHandlers}
    >
      <div className={styles.meta}>
        <span className={styles.number}>
          Dossiê {padTurn(turn)} / Ano {calendar.year}
        </span>
        {card.isCrisis ? (
          <span className={`${styles.chip} ${styles.crisisChip}`}>
            <span className={styles.chipMark} aria-hidden="true" />
            Crise
          </span>
        ) : (
          <span className={styles.chip}>{categoryLabel(card.category)}</span>
        )}
      </div>

      <div className={styles.portrait}>
        <CharacterPortrait
          speaker={card.speaker}
          headingId={headingId}
          sizes="(max-width: 1023px) 92vw, 470px"
          preload
        />
        {previewSide ? (
          <OfficialStamp
            variant="preview"
            heading="Prévia"
            lines={["Aguarda", "assinatura"]}
            className={styles.seal}
            data-side={previewSide}
          />
        ) : null}
      </div>

      <div className={styles.body}>
        <p className={styles.dilemma}>“{card.text}”</p>
        <div className={styles.footer}>
          <p className={styles.signature}>
            Assinado em despacho
            <span className={styles.signatureName}>{signatureName(card.speaker.name)}</span>
          </p>
          <p className={styles.verbs} aria-hidden="true">
            <span data-active={previewSide === "left" || undefined}>
              ← {shortVerb(card.choices.left.label)}
            </span>
            <span className={styles.verbDivider} />
            <span data-active={previewSide === "right" || undefined}>
              {shortVerb(card.choices.right.label)} →
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
