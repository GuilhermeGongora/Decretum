import { brazil } from "./brazil.js";

// Country registry. Brazil is the only playable pack; the United States is announced so the selection
// screen can show what is coming, and carries no rules or content on purpose (playbook §3.3, phase A).
// Countries are read through `loadContent()`, which validates them with the rest of the content.
export const countries = {
  BR: brazil,
  US: {
    countryCode: "US",
    playable: false,
    name: "Estados Unidos",
    longName: "United States of America",
    system: "República presidencialista federativa",
    summary:
      "Mandato de quatro anos com eleições de meio de mandato, Congresso bicameral com poder orçamentário próprio e uma Suprema Corte vitalícia de nove membros.",
    office: { role: "president", title: "President of the United States", termMonths: 48 },
    legislature: { name: "Congress", note: "House of Representatives e Senate." },
    developmentNote: "Pacote em desenvolvimento: regras institucionais e cartas próprias.",
  },
};
