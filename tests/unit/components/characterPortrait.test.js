/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { CharacterAvatar } from "@/app/_components/game/CharacterAvatar";
import { CharacterPortrait } from "@/app/_components/game/CharacterPortrait";
import { buildSpeakerView } from "./fixtures";

describe("CharacterPortrait", () => {
  it("shows the portrait the API resolved for the speaker, cropped at its position", () => {
    const { container } = render(<CharacterPortrait speaker={buildSpeakerView()} />);

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    expect(image.getAttribute("src")).toMatch(/otavio-leme\.webp/);
    expect(image.style.objectPosition).toBe("50% 24%");
    expect(screen.queryByText("OL")).toBeNull();
    expect(screen.getByRole("heading", { name: "General Otávio Leme" })).toBeTruthy();
  });

  it("uses the registry initials when the character has no portrait", () => {
    const speaker = buildSpeakerView({
      id: "mara-vilar",
      name: "Mara Vilar",
      title: "Ministra da Educação",
      initials: "MV",
      portrait: null,
    });

    const { container } = render(<CharacterPortrait speaker={speaker} />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("MV")).toBeTruthy();
  });

  it("derives initials from the name for an old snapshot without registry data", () => {
    const speaker = { name: "Helena Arcos", title: "Chefe da Casa Civil" };

    const { container } = render(<CharacterPortrait speaker={speaker} />);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("HA")).toBeTruthy();
  });

  it("falls back to initials when the portrait file fails to load", () => {
    const { container } = render(<CharacterPortrait speaker={buildSpeakerView()} />);

    fireEvent.error(container.querySelector("img"));

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("OL")).toBeTruthy();
  });

  it("applies the optional character accent to the frame", () => {
    const { container } = render(
      <CharacterPortrait speaker={buildSpeakerView({ accent: "#8e2b24" })} />,
    );

    expect(container.querySelector("figure").style.getPropertyValue("--portrait-accent")).toBe(
      "#8e2b24",
    );
  });
});

describe("CharacterAvatar", () => {
  it("falls back to initials when the portrait is missing", () => {
    const { container } = render(
      <CharacterAvatar speaker={buildSpeakerView({ portrait: null, initials: "OL" })} />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("OL");
  });
});
