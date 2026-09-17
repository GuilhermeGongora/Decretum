import styles from "./CountryFlag.module.css";

// The national flag of a country, next to its written name.
//
// Brazil is served as the official drawing (`public/assets/brand/flag-br.svg`, public domain as an
// act of the Brazilian State): 20:14, the yellow rhombus 1.7 modules from each edge, the blue globe
// of 3.5 modules, the white band between arcs of 8 and 8.5 modules, and the 27 stars in their five
// magnitudes. None of that is approximated in CSS, because a flag drawn by eye is a wrong flag.
//
// Every other country still shows the geometric mark below: the United States pack is not playable,
// and an approximate drawing is better replaced by its own official file when that pack is built.
// The name of the country is always written beside the mark, so both are decorative.
export function CountryFlag({ code = "BR" }) {
  if (code === "BR") {
    return (
      // The flag is vector: there is nothing for next/image to optimise, and routing an SVG through
      // the optimiser only adds a request.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.flag}
        src="/assets/brand/flag-br.svg"
        // Intrinsic 20:14; the displayed size comes from the stylesheet, which keeps the ratio.
        width="20"
        height="14"
        alt=""
        aria-hidden="true"
        decoding="async"
        draggable="false"
      />
    );
  }

  return (
    <span className={styles.mark} data-code={code} aria-hidden="true">
      <span className={styles.field} />
      <span className={styles.figure} />
    </span>
  );
}
