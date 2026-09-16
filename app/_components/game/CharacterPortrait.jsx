"use client";

import Image from "next/image";
import { useState } from "react";
import { initials } from "@/app/_lib/text";
import styles from "./CharacterPortrait.module.css";

// `speaker` is the API speaker view: the server resolves the portrait from the character registry by id.
export function CharacterPortrait({ speaker, headingId, sizes, preload = false }) {
  const { portrait } = speaker;
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(portrait) && failedSrc !== portrait.src;

  return (
    <figure
      className={styles.frame}
      data-has-image={showImage || undefined}
      style={speaker.accent ? { "--portrait-accent": speaker.accent } : undefined}
    >
      {showImage ? (
        <Image
          className={styles.image}
          src={portrait.src}
          alt=""
          fill
          sizes={sizes}
          preload={preload}
          style={{ objectPosition: portrait.position }}
          onError={() => setFailedSrc(portrait.src)}
        />
      ) : (
        <span className={styles.initials} aria-hidden="true">
          {speaker.initials ?? initials(speaker.name)}
        </span>
      )}
      <span className={styles.corners} aria-hidden="true" />
      <figcaption className={styles.caption}>
        <h2 id={headingId} className={styles.name}>
          {speaker.name}
        </h2>
        <span className={styles.title}>{speaker.title}</span>
      </figcaption>
    </figure>
  );
}
