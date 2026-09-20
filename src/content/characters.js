// Recurring characters (GDD §17 as revised by the approved character bible), keyed by stable kebab-case
// ids. Cards reference these ids; portraits are resolved from here, never from a display name.
// `sphere` is the pillar whose politics the character speaks for. Characters without artwork use their
// initials. Portraits are 4:5 WebP; `portraitPosition` is the object-position used when a frame crops.
//
// This registry is the single source of a character's profession. A card never decides what someone
// does for a living: it names an id, and the name and title shown come from here.
//
// `cabinet` says whether the person may hold a ministry at all, and which. Being in the cast is not a
// qualification: the Court, the Chamber's chair, the opposition, the press, the unions, industry and
// the governors are all ineligible, and a career change out of those posts is a content decision
// written here, never an implicit consequence of an appointment.
export const characters = {
  "helena-vasque": {
    name: "Helena Vasque",
    role: "Ministra-chefe da Casa Civil",
    sphere: "congress",
    initials: "HV",
    portrait: "/assets/characters/helena-vasque.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["casa_civil"] },
  },
  "caio-ferraz": {
    name: "Caio Ferraz",
    // He held the Fazenda until the president gave it to Lívia Nogueira. He stayed in the building,
    // one floor down, which is what makes him the obvious name if the pasta opens again.
    role: "Secretário do Tesouro Nacional",
    sphere: "market",
    initials: "CF",
    portrait: "/assets/characters/caio-ferraz.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["fazenda"] },
  },
  "livia-nogueira": {
    name: "Lívia Nogueira",
    role: "Ministra da Fazenda",
    sphere: "market",
    initials: "LN",
    portrait: "/assets/characters/livia-nogueira.webp",
    portraitPosition: "50% 23%",
    cabinet: { eligible: true, ministries: ["fazenda"] },
  },
  "mara-vilar": {
    name: "Mara Vilar",
    role: "Ministra da Educação",
    sphere: "people",
    initials: "MV",
    portrait: "/assets/characters/mara-vilar.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["educacao"] },
  },
  "icaro-nunes": {
    name: "Dr. Ícaro Nunes",
    role: "Ministro da Saúde",
    sphere: "people",
    initials: "ÍN",
    portrait: "/assets/characters/icaro-nunes.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["saude"] },
  },
  // An explicit career change, not an implicit one: the general left the Estado-Maior to take a post
  // the Constitution describes as civilian command of the armed forces. Someone who accepts it stops
  // commanding troops, and that is exactly why the appointment is political rather than routine.
  "otavio-leme": {
    name: "General Otávio Leme",
    role: "Ministro da Defesa",
    sphere: "institutions",
    initials: "OL",
    portrait: "/assets/characters/otavio-leme.webp",
    portraitPosition: "50% 24%",
    cabinet: { eligible: true, ministries: ["defesa"] },
  },
  "sofia-amaral": {
    name: "Sofia Amaral",
    role: "Ministra do Meio Ambiente",
    sphere: "people",
    initials: "SA",
    portrait: "/assets/characters/sofia-amaral.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["meio_ambiente"] },
  },
  // Nobody in the original cast could hold the Justice portfolio, so it starts vacant and these two
  // are the names the Presidency can reach for. They are deliberately opposite choices.
  "bruno-tavares": {
    name: "Bruno Tavares",
    role: "Procurador de carreira",
    sphere: "institutions",
    initials: "BT",
    portrait: "/assets/characters/bruno-tavares.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["justica"] },
  },
  "dalva-moreno": {
    name: "Dalva Moreno",
    role: "Advogada criminalista",
    sphere: "people",
    initials: "DM",
    portrait: "/assets/characters/dalva-moreno.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["justica"] },
  },
  "renata-pires": {
    name: "Renata Pires",
    role: "Reitora da Universidade Federal",
    sphere: "people",
    initials: "RP",
    portrait: "/assets/characters/renata-pires.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["educacao"] },
  },
  "helio-barbosa": {
    name: "Hélio Barbosa",
    role: "Sanitarista",
    sphere: "people",
    initials: "HB",
    portrait: "/assets/characters/helio-barbosa.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: true, ministries: ["saude"] },
  },
  "raul-mendonca": {
    name: "Raul Mendonça",
    role: "Líder da coalizão",
    sphere: "congress",
    initials: "RM",
    portrait: "/assets/characters/raul-mendonca.webp",
    portraitPosition: "50% 20%",
    cabinet: {
      eligible: false,
      reason: "Comanda a base no Congresso, e perderia a cadeira ao sair",
    },
  },
  "tomas-azevedo": {
    name: "Tomás Azevedo",
    role: "Presidente do Supremo Tribunal Federal",
    sphere: "institutions",
    initials: "TA",
    portrait: "/assets/characters/tomas-azevedo.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: false, reason: "Preside o Supremo e julga o próprio governo" },
  },
  "nina-vale": {
    name: "Nina Vale",
    role: "Jornalista do Correio Cívico",
    sphere: "institutions",
    initials: "NV",
    portrait: "/assets/characters/nina-vale.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: false, reason: "Cobre o governo que teria de servir" },
  },
  "tomas-gade": {
    name: "Tomás Gade",
    role: "Presidente da Federação Industrial",
    sphere: "market",
    initials: "TG",
    portrait: "/assets/characters/tomas-gade.webp",
    portraitPosition: "50% 22%",
    cabinet: { eligible: false, reason: "Representa o setor que o ministério regula" },
  },
  "joana-reis": {
    name: "Joana Reis",
    role: "Líder da Central dos Trabalhadores",
    sphere: "people",
    initials: "JR",
    cabinet: { eligible: false, reason: "Negocia com o governo em nome dos sindicatos" },
  },
  "yuri-salcedo": {
    name: "Yuri Salcedo",
    role: "Governador do Norte",
    sphere: "congress",
    initials: "YS",
    cabinet: { eligible: false, reason: "Tem mandato próprio e um estado para governar" },
  },
  // Chanceler is a ministerial post, but Relações Exteriores is not one of the portfolios the
  // Brazilian pack declares, so she holds no seat in this cabinet.
  "amira-sol": {
    name: "Amira Sol",
    role: "Chanceler",
    sphere: "institutions",
    initials: "AS",
    cabinet: { eligible: false, reason: "Chefia uma pasta que este pacote ainda não declara" },
  },
  // The constitutional chain needs two offices nobody in the cast holds: whoever presides the
  // Chamber decides whether a petition is even read, and the opposition is the one who files it.
  "celina-braga": {
    name: "Celina Braga",
    role: "Presidente da Câmara dos Deputados",
    sphere: "congress",
    initials: "CB",
    cabinet: { eligible: false, reason: "Preside a Casa que autoriza o impeachment" },
  },
  "andre-furtado": {
    name: "André Furtado",
    role: "Líder da oposição",
    sphere: "congress",
    initials: "AF",
    cabinet: { eligible: false, reason: "Lidera a oposição ao governo" },
  },
};

export function getCharacter(id) {
  return typeof id === "string" && Object.hasOwn(characters, id) ? characters[id] : null;
}

// Who may be given a portfolio, by id. Eligibility is declared per character and never inferred from
// a job title, so adding someone to the cast never quietly makes them appointable.
export function isEligibleFor(id, ministryKey) {
  const character = getCharacter(id);
  if (!character?.cabinet?.eligible) return false;
  return (character.cabinet.ministries ?? []).includes(ministryKey);
}
