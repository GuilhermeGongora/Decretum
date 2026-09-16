"use client";

import Image from "next/image";
import { useState } from "react";
import { initials } from "@/app/_lib/text";
import styles from "./CharacterAvatar.module.css";

// Circular crop for chronicles, logs and reactions (design 2g §04, 3c). Never the main portrait.
export function CharacterAvatar({ speaker, size = 44 }) {
  const { portrait } = speaker;
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = Boolean(portrait) && failedSrc !== portrait.src;

  return (
    <span className={styles.avatar} style={{ "--avatar-size": `${size}px` }} aria-hidden="true">
      {showImage ? (
        <Image
          className={styles.image}
          src={portrait.src}
          alt=""
          fill
          sizes={`${size}px`}
          style={{ objectPosition: portrait.position }}
          onError={() => setFailedSrc(portrait.src)}
        />
      ) : (
        (speaker.initials ?? initials(speaker.name))
      )}
    </span>
  );
}
