import { existsSync } from "node:fs";
import path from "node:path";
import { loadContent } from "@/src/content";
import { cardDefinitions } from "@/src/content/cards";
import { characters, getCharacter } from "@/src/content/characters";
import { endingDefinitions } from "@/src/content/endings";
import { epithetDefinitions } from "@/src/content/epithets";
import { flagCatalog } from "@/src/content/flags";
import { validateContent } from "@/src/content/validate";
import { toSpeakerView } from "@/src/services/gameViews";

describe("character registry", () => {
  it.each([
    ["helena-vasque", "Helena Vasque", "Ministra-chefe da Casa Civil"],
    ["livia-nogueira", "Lívia Nogueira", "Ministra da Fazenda"],
    ["tomas-azevedo", "Tomás Azevedo", "Presidente do Supremo Tribunal Federal"],
    ["raul-mendonca", "Raul Mendonça", "Líder da coalizão"],
  ])("finds %s by its stable id with the canonical name", (id, name, role) => {
    expect(getCharacter(id)).toMatchObject({ name, role });
  });

  it.each(["Helena Vasque", "helena_arcos", "livia_ornelas", "raul_serpa", undefined])(
    "does not resolve %s, which is not a character id",
    (key) => {
      expect(getCharacter(key)).toBeNull();
    },
  );

  it("gives artwork only to the characters with approved portraits", () => {
    const withPortrait = Object.entries(characters)
      .filter(([, character]) => character.portrait)
      .map(([id]) => id)
      .sort();

    // Everyone with artwork in the archive. The five still on initials are the ones nobody has
    // drawn yet: Joana Reis, Yuri Salcedo, Amira Sol, Celina Braga and André Furtado.
    expect(withPortrait).toEqual([
      "bruno-tavares",
      "caio-ferraz",
      "dalva-moreno",
      "helena-vasque",
      "helio-barbosa",
      "icaro-nunes",
      "livia-nogueira",
      "mara-vilar",
      "nina-vale",
      "otavio-leme",
      "raul-mendonca",
      "renata-pires",
      "sofia-amaral",
      "tomas-azevedo",
      "tomas-gade",
    ]);
  });

  it("points every portrait to an existing public WebP file", () => {
    for (const character of Object.values(characters)) {
      if (!character.portrait) continue;
      expect(character.portrait).toMatch(/\.webp$/);
      expect(existsSync(path.join(process.cwd(), "public", character.portrait))).toBe(true);
    }
  });

  it("is referenced by cards through ids, never through former names", () => {
    const source = JSON.stringify(cardDefinitions);

    expect(source).not.toMatch(/Arcos|Ornelas|Serpa|helena_arcos|livia_ornelas|raul_serpa/);
    for (const card of cardDefinitions) expect(getCharacter(card.speaker)).not.toBeNull();
  });
});

describe("toSpeakerView", () => {
  it("resolves the portrait of a registered character by id", () => {
    const view = toSpeakerView({
      id: "livia-nogueira",
      name: "Lívia Nogueira",
      title: "Ministra da Economia",
    });

    expect(view).toEqual({
      id: "livia-nogueira",
      name: "Lívia Nogueira",
      title: "Ministra da Economia",
      initials: "LN",
      portrait: { src: "/assets/characters/livia-nogueira.webp", position: "50% 23%" },
      accent: null,
    });
  });

  it("keeps a registered character without artwork on initials", () => {
    // Joana Reis is one of the five nobody has drawn yet, so she is the honest example here: Mara
    // Vilar used to be, and now has artwork.
    const view = toSpeakerView({ id: "joana-reis", name: "Joana Reis", title: "Líder sindical" });

    expect(view).toMatchObject({ portrait: null, initials: "JR" });
  });

  it("never looks a portrait up by display name", () => {
    expect(toSpeakerView({ name: "Helena Vasque", title: "Ministra" })).toMatchObject({
      id: null,
      portrait: null,
      initials: null,
    });
  });

  it("keeps the name and title of an old snapshot", () => {
    const view = toSpeakerView({ key: "helena_arcos", name: "Helena Arcos", title: "Chefe" });

    expect(view).toMatchObject({ name: "Helena Arcos", title: "Chefe", portrait: null });
  });
});

describe("character canon across cards", () => {
  const { cards } = loadContent();
  const speakersOf = (id) =>
    cards
      .filter((card) => card.speaker.id === id)
      .map((card) => card.slug)
      .sort();

  function contentWith(mutate) {
    const content = structuredClone({
      cards: cardDefinitions,
      flags: flagCatalog,
      characters,
      endings: endingDefinitions,
      epithets: epithetDefinitions,
    });
    mutate(content);
    return validateContent(content).errors;
  }

  it("gives every character id one name and one role in all the cards it speaks", () => {
    const identities = new Map();
    for (const { speaker } of cards) {
      const seen = identities.get(speaker.id) ?? new Set();
      seen.add(`${speaker.name} | ${speaker.title}`);
      identities.set(speaker.id, seen);
    }

    for (const [id, seen] of identities) {
      expect([id, [...seen]]).toEqual([id, [`${characters[id].name} | ${characters[id].role}`]]);
    }
  });

  it("gives every character a political sphere", () => {
    for (const character of Object.values(characters)) {
      expect(["people", "market", "congress", "institutions"]).toContain(character.sphere);
    }
  });

  it("rejects two ids that share a display name", () => {
    const errors = contentWith((content) => {
      content.characters["livia-ornelas"] = { ...content.characters["livia-nogueira"] };
    });

    expect(errors).toContainEqual(
      expect.stringMatching(
        /"livia-ornelas": name "Lívia Nogueira" is already used by "livia-nogueira"/,
      ),
    );
  });

  it("rejects a character without a political sphere", () => {
    const errors = contentWith((content) => delete content.characters["tomas-azevedo"].sphere);

    expect(errors).toContainEqual(expect.stringMatching(/"tomas-azevedo": sphere must be one of/));
  });

  // She holds the Fazenda now. Caio Ferraz, who held it before, went one floor down to the Tesouro
  // and remains the alternative name for the pasta — the registry, not a card, says so.
  it("keeps Lívia Nogueira, Ministra da Fazenda, in economic cards only", () => {
    expect(characters["livia-nogueira"]).toMatchObject({
      role: "Ministra da Fazenda",
      sphere: "market",
    });
    expect(characters["caio-ferraz"]).toMatchObject({
      role: "Secretário do Tesouro Nacional",
      cabinet: { eligible: true, ministries: ["fazenda"] },
    });

    const categories = cards
      .filter((card) => card.speaker.id === "livia-nogueira")
      .map((card) => card.category);
    expect(categories.length).toBeGreaterThan(0);
    for (const category of categories) expect(["economy", "budget"]).toContain(category);
  });

  it("gives the Supremo Tribunal Federal to Tomás Azevedo alone", () => {
    const judges = Object.entries(characters)
      .filter(([, character]) => /Supremo Tribunal Federal/.test(character.role))
      .map(([id]) => id);

    expect(judges).toEqual(["tomas-azevedo"]);
    expect(characters["tomas-azevedo"].sphere).toBe("institutions");
    // He also presides the Senate trial, which is the one other place the Court speaks.
    expect(speakersOf("tomas-azevedo")).toEqual([
      "contract_investigation",
      "impeachment_trial",
      "national_data_registry",
    ]);
  });

  it("keeps Tomás Gade as a separate industry character", () => {
    expect(characters["tomas-gade"]).toMatchObject({
      name: "Tomás Gade",
      role: "Presidente da Federação Industrial",
      sphere: "market",
    });
    expect(speakersOf("tomas-gade")).toEqual(["import_tariffs", "strategic_port_concession"]);
  });
});
