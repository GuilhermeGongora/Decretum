// Presentation profile of the MVP world (GDD §4: República de Aurória). The API does not expose a
// country yet, so screens read it from here; see docs/design/decretum-v2/UI_HANDOFF.md §14.
export const GOVERNMENT_PROFILE = Object.freeze({
  countryName: "Aurória",
  countryLongName: "República de Aurória",
  system: "Democracia presidencialista",
  headquarters: "Palácio Cívico",
  legislature: "Assembleia Nacional",
  constitutionalCourt: "Tribunal da Carta",
  summary:
    "Uma república urbana e industrializada, marcada por desigualdade regional, coalizões fragmentadas, imprensa ativa, Judiciário forte, forças armadas influentes e economia integrada ao exterior.",
  institutions: Object.freeze([
    { name: "Palácio Cívico", role: "sede da Presidência" },
    { name: "Assembleia Nacional", role: "parlamento da República" },
    { name: "Tribunal da Carta", role: "corte constitucional" },
    { name: "Banco de Aurória", role: "autoridade monetária" },
    { name: "Conselho Federativo", role: "articulação dos governadores" },
    { name: "Agência Nacional de Integridade", role: "órgão de controle" },
    { name: "Forças de Defesa de Aurória", role: "comando militar" },
    { name: "União das Províncias", role: "pacto federativo" },
  ]),
  oath: "Prometo manter, defender e cumprir a Carta, observar as leis e promover o bem-estar do povo de Aurória.",
});

const OFFICE_TITLES = Object.freeze({
  president: "Presidente da República",
});

export function officeTitle(role) {
  return OFFICE_TITLES[role] ?? role;
}
