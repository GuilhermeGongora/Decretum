import styles from "./BrandMark.module.css";

// The emblem of the Republic's archive: a low-poly helm with a sword that ends in a pen nib. It is
// the only place the artwork reaches a screen, so no page renders the file by hand and every context
// gets the same geometry, the same colours and the same transparency.
//
// The emblem is not the wordmark: DECRETUM stays typographic wherever it appears. This component
// never draws the name.
//
// The artwork is raster (low-poly facets do not survive a trace), so it is served as a transparent
// WebP in three sizes and the browser picks one. Nothing here recolours, crops, outlines or reshapes
// it: a mark that is tinted or boxed is a different mark.
const SIZES = {
  // Cover: the emblem opens the composition above the institutional line.
  home: 68,
  // Header of the mandate: small enough to sit beside the country without crowding it.
  header: 30,
  // Documents and ceremonial screens.
  document: 44,
  seal: 96,
  // Watermark: large and almost invisible, behind the reading.
  watermark: 200,
};

export function BrandMark({ variant = "header", label = null, className = "" }) {
  const size = SIZES[variant] ?? SIZES.header;
  // Decorative wherever the name DECRETUM is already written next to it, which is every context but
  // a standalone mark. An empty alt keeps a screen reader from announcing the brand twice.
  const alt = label ?? "";

  return (
    // next/image would put a resizing round-trip in front of a 12 KB emblem that is already served
    // at the three sizes it is ever drawn at, and whose box is fixed here. A plain img is the lighter
    // and more predictable element for it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`${styles.mark} ${className}`.trim()}
      data-variant={variant}
      src="/assets/brand/emblem-256.webp"
      srcSet="/assets/brand/emblem-128.webp 128w, /assets/brand/emblem-256.webp 256w, /assets/brand/emblem-512.webp 512w"
      sizes={`${size}px`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt === "" ? "true" : undefined}
      decoding="async"
      // The cover and the header paint it immediately; a watermark can wait.
      loading={variant === "watermark" ? "lazy" : "eager"}
      draggable="false"
    />
  );
}
