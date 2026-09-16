"use client";

import { useId } from "react";
import { describeBand, formatDelta, trendArrows, trendWord } from "@/app/_lib/text";
import { EMBLEM_PATHS } from "./emblems";
import styles from "./PowerIndicators.module.css";

function Emblem({ pillar, value, severity }) {
  const id = useId();
  const path = EMBLEM_PATHS[pillar];
  const fillHeight = (40 * value) / 100;

  return (
    <svg className={styles.emblem} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={path} />
        </clipPath>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={severity === "critical" ? "#a8332a" : "#d3ae6d"} />
          <stop offset="1" stopColor={severity === "critical" ? "#71211c" : "#a8834a"} />
        </linearGradient>
      </defs>
      <path d={path} fill="rgb(244 239 227 / 0.08)" />
      <g clipPath={`url(#${id}-clip)`}>
        <rect
          className={styles.emblemFill}
          x="0"
          y="0"
          width="40"
          height="40"
          fill={`url(#${id}-fill)`}
          style={{ transform: `translateY(${40 - fillHeight}px)` }}
        />
      </g>
      <path d={path} fill="none" stroke="rgb(176 141 79 / 0.62)" strokeWidth="1" />
      {pillar === "people" ? (
        <circle
          cx="20"
          cy="20"
          r="6"
          fill="none"
          stroke="rgb(244 239 227 / 0.88)"
          strokeWidth="2"
        />
      ) : null}
      {pillar === "congress" ? (
        <rect x="18.5" y="17" width="3" height="23" fill="rgb(11 23 41 / 0.6)" />
      ) : null}
    </svg>
  );
}

export function PowerIndicator({ pillar, meter, trend = null, delta = null }) {
  const { value, band } = meter;
  const { statusWord, severity } = describeBand(band);
  const showTrend = trend !== null && trend.direction !== "none";

  return (
    <li className={styles.indicator} data-severity={severity}>
      <Emblem pillar={pillar.key} value={value} severity={severity} />
      <span className={styles.value}>
        {value}
        {delta ? (
          <span className={styles.delta} data-direction={delta > 0 ? "up" : "down"}>
            {formatDelta(delta)}
          </span>
        ) : null}
      </span>
      <span className={styles.name}>{pillar.name}</span>
      <span className={styles.status}>
        {showTrend ? (
          <span className={styles.trendChip} data-direction={trend.direction}>
            <span aria-hidden="true">{trendArrows(trend)} </span>
            <span className={styles.trendWord}>{trendWord(trend)}</span>
          </span>
        ) : (
          statusWord
        )}
      </span>
      <span
        className={styles.ruler}
        role="meter"
        aria-label={pillar.name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}, ${statusWord}`}
      >
        <span className={styles.marker} style={{ left: `${value}%` }} />
      </span>
    </li>
  );
}
