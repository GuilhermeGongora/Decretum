// Recurring characters (GDD §17 as revised by the approved character bible), keyed by stable kebab-case
// ids. Cards reference these ids; portraits are resolved from here, never from a display name.
// `sphere` is the pillar whose politics the character speaks for. Characters without artwork use their
// initials. Portraits are 4:5 WebP; `portraitPosition` is the object-position used when a frame crops.
export const characters = {
  "helena-vasque": {
    name: "Helena Vasque",
    role: "Ministra-chefe da Casa Civil",
    sphere: "congress",
    initials: "HV",
    portrait: "/assets/characters/helena-vasque.webp",
    portraitPosition: "50% 22%",
  },
  "caio-ferraz": {
    name: "Caio Ferraz",
    role: "Ministro da Fazenda",
    sphere: "market",
    initials: "CF",
  },
  "livia-nogueira": {
    name: "Lívia Nogueira",
    role: "Ministra da Economia",
    sphere: "market",
    initials: "LN",
    portrait: "/assets/characters/livia-nogueira.webp",
    portraitPosition: "50% 23%",
  },
  "mara-vilar": {
    name: "Mara Vilar",
    role: "Ministra da Educação",
    sphere: "people",
    initials: "MV",
  },
  "icaro-nunes": {
    name: "Dr. Ícaro Nunes",
    role: "Ministro da Saúde",
    sphere: "people",
    initials: "ÍN",
  },
  "raul-mendonca": {
    name: "Raul Mendonça",
    role: "Líder da coalizão",
    sphere: "congress",
    initials: "RM",
    portrait: "/assets/characters/raul-mendonca.webp",
    portraitPosition: "50% 20%",
  },
  "tomas-azevedo": {
    name: "Tomás Azevedo",
    role: "Presidente do Supremo Tribunal Federal",
    sphere: "institutions",
    initials: "TA",
  },
  "nina-vale": {
    name: "Nina Vale",
    role: "Jornalista do Correio Cívico",
    sphere: "institutions",
    initials: "NV",
  },
  "tomas-gade": {
    name: "Tomás Gade",
    role: "Presidente da Federação Industrial",
    sphere: "market",
    initials: "TG",
  },
  "joana-reis": {
    name: "Joana Reis",
    role: "Líder da Central dos Trabalhadores",
    sphere: "people",
    initials: "JR",
  },
  "otavio-leme": {
    name: "General Otávio Leme",
    role: "Chefe do Estado-Maior Conjunto",
    sphere: "institutions",
    initials: "OL",
    portrait: "/assets/characters/otavio-leme.webp",
    portraitPosition: "50% 24%",
  },
  "yuri-salcedo": {
    name: "Yuri Salcedo",
    role: "Governador do Norte",
    sphere: "congress",
    initials: "YS",
  },
  "amira-sol": { name: "Amira Sol", role: "Chanceler", sphere: "institutions", initials: "AS" },
  // The constitutional chain needs two offices nobody in the cast holds: whoever presides the
  // Chamber decides whether a petition is even read, and the opposition is the one who files it.
  "celina-braga": {
    name: "Celina Braga",
    role: "Presidente da Câmara dos Deputados",
    sphere: "congress",
    initials: "CB",
  },
  "andre-furtado": {
    name: "André Furtado",
    role: "Líder da oposição",
    sphere: "congress",
    initials: "AF",
  },
};

export function getCharacter(id) {
  return typeof id === "string" && Object.hasOwn(characters, id) ? characters[id] : null;
}
