"use client";

import { useEffect, useRef } from "react";
import styles from "./CursorGlow.module.css";

// Ambient light falling on paper, stone and metal: a soft brass pool that follows the pointer with a
// small lag. Decorative and inert — it lives inside the atmosphere layer, below every reading surface.
//
// The pointer never touches React state: the listener writes to refs and one rAF loop moves the node
// with a transform. The loop stops as soon as the light settles, when the pointer leaves, and while
// the page is hidden, so an idle tab costs nothing.
const EASING = 0.14;
const SETTLED_PX = 0.4;

export function CursorGlow({ intensity = "normal" }) {
  const nodeRef = useRef(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || typeof window.matchMedia !== "function") return undefined;

    // A coarse pointer has no hover, and reduced motion asks for no chasing light at all.
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || calm.matches) return undefined;

    let frame = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;

    const draw = () => {
      const dx = targetX - x;
      const dy = targetY - y;
      x += dx * EASING;
      y += dy * EASING;
      node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

      if (Math.abs(dx) < SETTLED_PX && Math.abs(dy) < SETTLED_PX) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(draw);
    };

    const schedule = () => {
      if (!frame && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const handleMove = (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      node.dataset.lit = "true";
      schedule();
    };

    const handleLeave = (event) => {
      // relatedTarget is null when the pointer actually left the window.
      if (event.relatedTarget === null) delete node.dataset.lit;
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
    };

    // Placed at the centre before the first move, so the light fades in where it will be.
    node.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerout", handleLeave);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerout", handleLeave);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (intensity === "off") return null;

  return (
    <div
      ref={nodeRef}
      className={styles.glow}
      data-layer="glow"
      data-intensity={intensity}
      aria-hidden="true"
    />
  );
}
