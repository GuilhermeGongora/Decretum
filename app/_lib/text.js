// Presentation text in Brazilian Portuguese. No game rules live here.
// Pillar descriptions and risks follow GDD §8.1–8.4.
export const PILLARS = [
  {
    key: "people",
    name: "Povo",
    symbol: "●",
    description: "apoio popular e mobilização social",
    risks: {
      low: "deslegitimação, revolta, greve generalizada",
      high: "personalismo e pressão das massas acima das regras",
    },
  },
  {
    key: "market",
    name: "Mercado",
    symbol: "▲",
    description: "confiança econômica e influência do capital",
    risks: {
      low: "recessão, desabastecimento, fuga de capitais",
      high: "captura regulatória do governo",
    },
  },
  {
    key: "congress",
    name: "Congresso",
    symbol: "■",
    description: "base parlamentar e dependência da coalizão",
    risks: {
      low: "isolamento e paralisia",
      high: "chantagem orçamentária e tutela parlamentar",
    },
  },
  {
    key: "institutions",
    name: "Instituições",
    symbol: "◆",
    description: "Judiciário, controles e ordem constitucional",
    risks: {
      low: "ruptura da ordem legal",
      high: "governo tutelado ou paralisado",
    },
  },
];

const PILLAR_NAMES = Object.fromEntries(PILLARS.map((pillar) => [pillar.key, pillar.name]));

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Labels for the reading bands computed by the server (GDD §8.5).
const BANDS = {
  collapsed_low: { label: "Colapso", statusWord: "Colapso", severity: "critical", icon: "✕" },
  critical_low: {
    label: "Crítico · baixo",
    statusWord: "Crítico",
    severity: "critical",
    icon: "!!",
  },
  unstable_low: { label: "Instável · baixo", statusWord: "Tenso", severity: "unstable", icon: "!" },
  governable: { label: "Governável", statusWord: "Estável", severity: "stable", icon: "✓" },
  unstable_high: {
    label: "Instável · alto",
    statusWord: "Dependente",
    severity: "unstable",
    icon: "!",
  },
  critical_high: {
    label: "Crítico · alto",
    statusWord: "Dominante",
    severity: "critical",
    icon: "!!",
  },
  collapsed_high: { label: "Domínio", statusWord: "Domínio", severity: "critical", icon: "✕" },
};

const CATEGORY_LABELS = {
  economy: "Economia",
  budget: "Orçamento",
  health: "Saúde",
  education: "Educação",
  infrastructure: "Infraestrutura",
  security: "Segurança",
  labor: "Trabalho",
  environment: "Meio ambiente",
  foreign_affairs: "Relações exteriores",
  federalism: "Federação",
  justice: "Justiça",
  media: "Imprensa",
  civil_rights: "Direitos civis",
  scandal: "Escândalo",
  congress: "Congresso",
};

const ERROR_MESSAGES = {
  NETWORK_ERROR: "Sem conexão com o Palácio. Verifique a rede e tente novamente.",
  TURN_ALREADY_DECIDED: "Este mês já havia sido decidido. O governo foi atualizado.",
  GAME_NOT_ACTIVE: "Este governo já terminou.",
  GAME_NOT_FOUND: "Não encontramos este governo.",
  GAME_STILL_ACTIVE: "O governo atual ainda está em andamento.",
  SUCCESSOR_ALREADY_EXISTS: "Este governo já tem um sucessor.",
  RATE_LIMITED: "Muitas requisições deste endereço. Aguarde alguns minutos e tente novamente.",
};

const TREND_WORDS = {
  up: ["", "sobe leve", "sobe", "sobe forte"],
  down: ["", "desce leve", "desce", "desce forte"],
};

export function pillarName(key) {
  return PILLAR_NAMES[key] ?? key;
}

export function monthName({ monthIndex }) {
  return MONTHS[monthIndex];
}

export function formatCalendar({ year, monthIndex }) {
  return `${MONTHS[monthIndex]}, Ano ${year}`;
}

export function formatDossierDate({ year, monthIndex }) {
  return `${MONTHS[monthIndex]} · Ano ${year}`;
}

export function formatShortCalendar({ year, monthIndex }) {
  return `${MONTHS[monthIndex].slice(0, 3)} · A${year}`;
}

export function padTurn(turn) {
  return String(turn).padStart(2, "0");
}

export function formatDelta(delta) {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function describeBand(band) {
  return BANDS[band] ?? BANDS.governable;
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] ?? category;
}

export function formatDuration({ years, remainingMonths }) {
  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
  if (remainingMonths > 0 || parts.length === 0) {
    parts.push(`${remainingMonths} ${remainingMonths === 1 ? "mês" : "meses"}`);
  }
  return parts.join(" e ");
}

export function formatDeltas(deltas) {
  return PILLARS.filter(({ key }) => deltas[key] !== 0)
    .map(({ key, name }) => `${name} ${formatDelta(deltas[key])}`)
    .join(" · ");
}

export function trendArrows({ direction, strength }) {
  if (direction === "none") return "";
  return (direction === "up" ? "↑" : "↓").repeat(strength);
}

export function trendWord({ direction, strength }) {
  if (direction === "none") return "";
  return TREND_WORDS[direction][strength];
}

// Screen-reader summary of the trends the server resolved for one choice.
export function describeEffects(effects, exactEffects) {
  const parts = PILLARS.filter(({ key }) => effects[key].strength > 0).map(({ key, name }) => {
    const effect = effects[key];
    return exactEffects ? `${name} ${formatDelta(effect.delta)}` : `${name} ${trendWord(effect)}`;
  });
  return parts.length > 0
    ? `Tendências: ${parts.join(", ")}.`
    : "Sem impacto aparente nos pilares.";
}

function nameParts(name) {
  return name.split(" ").filter((part) => part && !["Dr.", "Dra.", "General"].includes(part));
}

export function initials(name) {
  return nameParts(name)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

export function signatureName(name) {
  const parts = nameParts(name);
  if (parts.length < 2) return parts.join(" ");
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

export function shortVerb(label) {
  return label.split(" ")[0];
}

export function errorMessage(error) {
  return ERROR_MESSAGES[error?.code] ?? "Algo deu errado. Tente novamente em instantes.";
}
