/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { BrandMark } from "@/app/_components/brand/BrandMark";
import { Scene } from "@/app/_components/atmosphere/Scene";
import { CountryFlag } from "@/app/_components/game/CountryFlag";
import { GovernmentHeader } from "@/app/_components/game/GovernmentHeader";

const markOf = (container) => container.querySelector("img");

describe("BrandMark", () => {
  it("serves the emblem from one place, in the three sizes a browser may pick", () => {
    const { container } = render(<BrandMark />);
    const mark = markOf(container);

    expect(mark.getAttribute("src")).toBe("/assets/brand/emblem-256.webp");
    expect(mark.getAttribute("srcset")).toContain("/assets/brand/emblem-128.webp 128w");
    expect(mark.getAttribute("srcset")).toContain("/assets/brand/emblem-512.webp 512w");
  });

  it("is square in every context, so the artwork is never stretched", () => {
    for (const variant of ["home", "header", "document", "seal", "watermark"]) {
      const { container } = render(<BrandMark variant={variant} />);
      const mark = markOf(container);

      expect(mark.getAttribute("width")).toBe(mark.getAttribute("height"));
      expect(Number(mark.getAttribute("width"))).toBeGreaterThan(0);
    }
  });

  it("gives the header a smaller emblem than the cover", () => {
    const { container: cover } = render(<BrandMark variant="home" />);
    const { container: header } = render(<BrandMark variant="header" />);

    expect(Number(markOf(cover).getAttribute("width"))).toBeGreaterThan(
      Number(markOf(header).getAttribute("width")),
    );
  });

  it("is decorative where the name is already written beside it", () => {
    const { container } = render(<BrandMark />);
    const mark = markOf(container);

    expect(mark.getAttribute("alt")).toBe("");
    expect(mark.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("is announced when it stands for the name by itself", () => {
    render(<BrandMark label="Decretum" />);

    expect(screen.getByRole("img", { name: "Decretum" })).toBeTruthy();
  });

  it("never draws the wordmark: the emblem and the name are different things", () => {
    const { container } = render(<BrandMark variant="home" />);

    expect(container.textContent).toBe("");
  });

  it("falls back to an unknown variant instead of rendering nothing", () => {
    const { container } = render(<BrandMark variant="banquete" />);

    expect(markOf(container)).not.toBeNull();
  });
});

describe("CountryFlag", () => {
  it("flies the official drawing of the Brazilian flag, not an approximation", () => {
    const { container } = render(<CountryFlag code="BR" />);
    const flag = markOf(container);

    expect(flag.getAttribute("src")).toBe("/assets/brand/flag-br.svg");
    // 20:14 is the constitutional ratio.
    expect(flag.getAttribute("width")).toBe("20");
    expect(flag.getAttribute("height")).toBe("14");
  });

  it("no longer draws Brazil with coloured boxes in CSS", () => {
    const { container } = render(<CountryFlag code="BR" />);

    expect(container.querySelector("[data-code]")).toBeNull();
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("is decorative, because the country is written next to it", () => {
    const { container } = render(<CountryFlag code="BR" />);

    expect(markOf(container).getAttribute("alt")).toBe("");
    expect(screen.queryAllByRole("img")).toHaveLength(0);
  });

  it("keeps the geometric mark for a pack that has no official file yet", () => {
    const { container } = render(<CountryFlag code="US" />);

    expect(markOf(container)).toBeNull();
    expect(container.querySelector('[data-code="US"]')).not.toBeNull();
  });
});

describe("the header of a mandate", () => {
  function renderHeader() {
    return render(
      <GovernmentHeader
        country={{ code: "BR", name: "Brasil", office: { title: "Presidente da República" } }}
        officeTitle="Presidente da República"
        calendar={{ year: 1, monthIndex: 6 }}
        turn={7}
        totalTurns={48}
        onOpenChronicle={() => {}}
        onOpenSettings={() => {}}
      />,
    );
  }

  it("separates the game, the country and the office", () => {
    const { container } = renderHeader();

    expect(screen.getByText("Decretum")).toBeTruthy();
    expect(screen.getByText("Brasil")).toBeTruthy();
    expect(screen.getByText("Presidente da República")).toBeTruthy();
    // Two marks, and they are not interchangeable: the emblem and the flag.
    const images = [...container.querySelectorAll("img")].map((image) => image.getAttribute("src"));
    expect(images).toEqual(["/assets/brand/emblem-256.webp", "/assets/brand/flag-br.svg"]);
  });

  it("keeps the chronicle and the settings reachable", () => {
    renderHeader();

    expect(screen.getByRole("button", { name: "Crônica" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pausa e configurações" })).toBeTruthy();
  });
});

describe("the scene of the mandate", () => {
  it("paints the office at night behind the decision", () => {
    const { container } = render(<Scene name="decision" />);

    expect(container.querySelector("img").getAttribute("src")).toBe(
      "/assets/scenes/decision-desktop.webp",
    );
    expect(container.querySelector("source").getAttribute("srcset")).toBe(
      "/assets/scenes/decision-mobile.webp",
    );
  });

  it("keeps its atmosphere at the quietest: the screen is for reading and deciding", () => {
    const { container } = render(<Scene name="decision" />);

    expect(container.querySelector('[data-layer="glow"]').dataset.intensity).toBe("soft");
    expect(container.querySelector('[data-layer="particles"]').dataset.intensity).toBe("sparse");
  });

  it("is decorative and cannot be reached by a keyboard", () => {
    const { container } = render(<Scene name="decision" />);

    expect(container.firstChild.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0);
  });
});
