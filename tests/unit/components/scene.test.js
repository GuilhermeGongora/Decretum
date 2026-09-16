/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { AtmosphericParticles } from "@/app/_components/atmosphere/AtmosphericParticles";
import { CursorGlow } from "@/app/_components/atmosphere/CursorGlow";
import { Scene } from "@/app/_components/atmosphere/Scene";

const glowOf = (container) => container.querySelector('[data-layer="glow"]');
const dustOf = (container) => container.querySelector('[data-layer="particles"]');

describe("Scene", () => {
  it("paints the artwork and both atmosphere layers behind the screen", () => {
    const { container } = render(<Scene name="home" />);

    const image = container.querySelector("img");
    expect(image.getAttribute("src")).toBe("/assets/scenes/home-desktop.webp");
    expect(container.querySelector("source").getAttribute("srcset")).toBe(
      "/assets/scenes/home-mobile.webp",
    );
    expect(glowOf(container)).not.toBeNull();
    expect(dustOf(container)).not.toBeNull();
  });

  it("is decorative: hidden from assistive technology and holding no content", () => {
    const { container } = render(<Scene name="ceremony" />);

    expect(container.firstChild.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("img").getAttribute("alt")).toBe("");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    // Nothing in the layer can take focus.
    expect(container.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0);
  });

  it("keeps the light and the dust under the contrast veil", () => {
    const { container } = render(<Scene name="home" />);
    const layers = [...container.firstChild.children].map(
      (child) => child.dataset.layer ?? child.tagName.toLowerCase(),
    );

    expect(layers).toEqual(["picture", "glow", "particles", "div"]);
  });

  it("gives a dense reading screen a quieter atmosphere than the cover", () => {
    const { container: cover } = render(<Scene name="home" />);
    const { container: archive } = render(<Scene name="archive" />);

    expect(glowOf(cover).dataset.intensity).toBe("normal");
    expect(dustOf(cover).dataset.intensity).toBe("normal");
    expect(glowOf(archive).dataset.intensity).toBe("soft");
    expect(dustOf(archive).dataset.intensity).toBe("sparse");
  });

  it("lets a screen override or switch off each effect", () => {
    const { container } = render(<Scene name="home" glow="off" particles="soft" />);

    expect(glowOf(container)).toBeNull();
    expect(dustOf(container).dataset.intensity).toBe("soft");
  });

  it("renders nothing for a scene that does not exist", () => {
    const { container } = render(<Scene name="banquete" />);

    expect(container.firstChild).toBeNull();
  });

  it("does not stack a second atmosphere when the screen rerenders", () => {
    const { container, rerender } = render(<Scene name="debate" />);
    rerender(<Scene name="debate" />);
    rerender(<Scene name="debate" intensity="deep" />);

    expect(container.querySelectorAll('[data-layer="glow"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-layer="particles"]')).toHaveLength(1);
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});

describe("AtmosphericParticles", () => {
  it("renders the same dust every time, from a fixed definition", () => {
    const { container: first } = render(<AtmosphericParticles />);
    const { container: second } = render(<AtmosphericParticles />);

    const positions = (container) =>
      [...container.querySelectorAll("span")].map((mote) => mote.getAttribute("style"));

    expect(positions(first)).toHaveLength(18);
    expect(positions(first)).toEqual(positions(second));
  });

  it("varies size, opacity and duration across the motes", () => {
    const { container } = render(<AtmosphericParticles />);
    const styles = [...container.querySelectorAll("span")].map((mote) => mote.style);

    expect(new Set(styles.map((style) => style.getPropertyValue("--size"))).size).toBeGreaterThan(
      1,
    );
    expect(new Set(styles.map((style) => style.getPropertyValue("--alpha"))).size).toBeGreaterThan(
      4,
    );
    for (const style of styles) {
      expect(Number.parseFloat(style.getPropertyValue("--duration"))).toBeGreaterThanOrEqual(60);
      expect(Number.parseFloat(style.getPropertyValue("--duration"))).toBeLessThanOrEqual(140);
      // Negative delays, so the motes never start together.
      expect(Number.parseFloat(style.getPropertyValue("--delay"))).toBeLessThan(0);
    }
  });

  it("disappears entirely when switched off", () => {
    const { container } = render(<AtmosphericParticles intensity="off" />);

    expect(container.firstChild).toBeNull();
  });
});

describe("CursorGlow", () => {
  it("is an inert decorative layer", () => {
    const { container } = render(<CursorGlow />);

    expect(container.firstChild.getAttribute("aria-hidden")).toBe("true");
    expect(container.firstChild.children).toHaveLength(0);
  });

  it("disappears entirely when switched off", () => {
    const { container } = render(<CursorGlow intensity="off" />);

    expect(container.firstChild).toBeNull();
  });

  it("survives an environment without matchMedia, as on the server-rendered first paint", () => {
    const original = window.matchMedia;
    delete window.matchMedia;

    expect(() => render(<CursorGlow />)).not.toThrow();

    window.matchMedia = original;
  });
});
