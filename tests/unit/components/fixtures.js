// API-shaped test data for UI components (the shapes returned by src/services/gameViews.js).
function effect(delta) {
  const magnitude = Math.abs(delta);
  return {
    delta,
    direction: delta === 0 ? "none" : delta > 0 ? "up" : "down",
    strength: magnitude === 0 ? 0 : magnitude <= 3 ? 1 : magnitude <= 7 ? 2 : 3,
  };
}

function effects(people, market, congress, institutions) {
  return {
    people: effect(people),
    market: effect(market),
    congress: effect(congress),
    institutions: effect(institutions),
  };
}

export function buildCountryView(overrides = {}) {
  return {
    code: "BR",
    playable: true,
    name: "Brasil",
    longName: "República Federativa do Brasil",
    demonym: "brasileira",
    system: "República presidencialista federativa",
    systemNote: "Presidencialismo de coalizão: a base se renegocia a cada votação.",
    summary: "Federação continental com Congresso fragmentado e Judiciário forte.",
    oath: "Prometo manter, defender e cumprir a Constituição, observar as leis, promover o bem geral do povo brasileiro.",
    office: {
      title: "Presidente da República",
      shortTitle: "Presidente",
      address: "Senhor Presidente",
      headquarters: "Palácio do Planalto",
      termMonths: 48,
      termNote: "Quatro anos, com uma reeleição permitida.",
    },
    electoralRules: {
      system: "Maioria absoluta dos votos válidos, em até dois turnos",
      runoffThreshold: 50,
      rounds: 2,
    },
    legislature: { name: "Congresso Nacional", note: "Câmara dos Deputados e Senado Federal." },
    powers: {
      executive: { name: "Poder Executivo", note: "Presidência e ministérios." },
      lowerHouse: { name: "Câmara dos Deputados", seats: 513, note: "Admite o impeachment." },
      upperHouse: { name: "Senado Federal", seats: 81, note: "Julga o Presidente." },
      supremeCourt: {
        name: "Supremo Tribunal Federal",
        shortName: "STF",
        justices: 11,
        note: "Atores independentes: não integram o gabinete.",
      },
      federation: {
        name: "Estados e municípios",
        units: 27,
        note: "Governadores negociam repasses.",
      },
    },
    keyMinistries: [
      { key: "casa_civil", name: "Casa Civil", note: "coordenação do governo" },
      { key: "fazenda", name: "Fazenda", note: "política econômica e orçamento" },
      { key: "justica", name: "Justiça", note: "segurança pública e ordem legal" },
    ],
    removal: {
      type: "impeachment",
      note: "Denúncia na Câmara, julgamento no Senado.",
      stages: [
        { key: "stable", label: "Sem processo" },
        { key: "petition", label: "Pedido protocolado" },
      ],
    },
    terminology: {
      legislature: "Congresso",
      lowerHouse: "Câmara",
      upperHouse: "Senado",
      court: "Supremo",
      subnational: "estados",
      subnationalLeader: "governadores",
      centralBank: "Banco Central",
      pillars: {
        people: "Povo",
        market: "Mercado",
        congress: "Congresso",
        institutions: "Instituições",
      },
    },
    theme: { accent: "#1d6b4a", architecture: "brasilia_modernism" },
    regions: ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"],
    ...overrides,
  };
}

export function buildCandidateOptionsView(overrides = {}) {
  return {
    treatments: [
      { key: "senhor", label: "Senhor Presidente" },
      { key: "senhora", label: "Senhora Presidenta" },
    ],
    origins: [
      { key: "sindical", label: "Origem sindical", note: "Anos de negociação coletiva." },
      { key: "empresarial", label: "Origem empresarial", note: "Veio da indústria." },
    ],
    styles: [
      { key: "conciliador", label: "Conciliador", note: "Negocia antes de decidir." },
      { key: "tecnico", label: "Técnico", note: "Decide por dados." },
    ],
    parties: [
      { key: "pcn", name: "Partido Cívico Nacional", acronym: "PCN", lean: "centro" },
      { key: "fnt", name: "Frente Nacional do Trabalho", acronym: "FNT", lean: "centro-esquerda" },
    ],
    coalitions: [
      { key: "ampla", label: "Coligação Brasil de Pé", note: "Nove partidos." },
      { key: "minima", label: "Aliança mínima", note: "Campanha quase sozinha." },
    ],
    promises: [
      { key: "fiscal", label: "Responsabilidade fiscal", note: "Equilibrar as contas." },
      { key: "social", label: "Expansão social", note: "Creches, saúde e renda mínima." },
    ],
    ...overrides,
  };
}

export function buildCampaignView(overrides = {}) {
  return {
    opponent: {
      name: "Senador Everaldo Brandão",
      party: "Movimento Republicano Popular",
      acronym: "MRP",
      note: "Três mandatos no Senado.",
    },
    questions: [
      {
        id: "economy_debate",
        kicker: "Debate na TV · Setembro",
        text: "O mediador pergunta o que você fará no primeiro mês.",
        options: {
          left: { id: "austerity", label: "Prometer ajuste", note: "Corte de despesas." },
          right: { id: "expansion", label: "Prometer expansão", note: "Mais gasto social." },
        },
      },
      {
        id: "final_stretch",
        kicker: "Última semana · Outubro",
        text: "Resta uma semana e uma agenda.",
        options: {
          left: { id: "street_rally", label: "Ir às ruas", note: "Comício com movimentos." },
          right: { id: "market_round", label: "Falar ao mercado", note: "Encontros fechados." },
        },
      },
    ],
    ...overrides,
  };
}

export function buildCandidateSnapshot(overrides = {}) {
  return {
    name: "Ana Prado",
    treatment: { key: "senhora", label: "Senhora Presidenta" },
    origin: { key: "sindical", label: "Origem sindical" },
    style: { key: "conciliador", label: "Conciliador" },
    party: { key: "fnt", name: "Frente Nacional do Trabalho", acronym: "FNT" },
    coalition: { key: "ampla", label: "Coligação Brasil de Pé" },
    promise: { key: "social", label: "Expansão social" },
    ...overrides,
  };
}

export function buildElectionView(overrides = {}) {
  return {
    round: 1,
    share: 51.8,
    opponentShare: 48.2,
    margin: 3.6,
    votes: 59_700_000,
    opponentVotes: 55_550_000,
    validVotes: 115_250_000,
    turnout: 78.2,
    strongholds: ["Nordeste", "Norte"],
    coalitionStrength: 58,
    headline: "País elege nova Presidência por margem apertada e abre mandato sob contestação",
    summary: "Metade do país votou no outro lado.",
    opponent: {
      name: "Senador Everaldo Brandão",
      party: "Movimento Republicano Popular",
      acronym: "MRP",
    },
    decisions: [],
    ...overrides,
  };
}

export function buildGameView(overrides = {}) {
  return {
    id: "3f0c2a8e-0000-4000-8000-000000000001",
    role: "president",
    status: "active",
    turn: 7,
    calendar: { year: 1, monthIndex: 6 },
    startYear: 1,
    meters: {
      people: { value: 35, band: "governable" },
      market: { value: 60, band: "governable" },
      congress: { value: 50, band: "governable" },
      institutions: { value: 12, band: "critical_low" },
    },
    country: buildCountryView(),
    candidate: null,
    election: null,
    mandateCompleted: false,
    endingCode: null,
    previousGameId: null,
    ...overrides,
  };
}

export function buildSpeakerView(overrides = {}) {
  return {
    id: "otavio-leme",
    name: "General Otávio Leme",
    title: "Chefe do Estado-Maior Conjunto",
    initials: "OL",
    portrait: { src: "/assets/characters/otavio-leme.webp", position: "50% 24%" },
    accent: null,
    ...overrides,
  };
}

export function buildCardView(overrides = {}) {
  return {
    slug: "security_march",
    type: "common",
    category: "security",
    isCrisis: false,
    speaker: buildSpeakerView(),
    text: "Após uma onda de violência, manifestantes pedem patrulhamento militar temporário nas grandes cidades.",
    choices: {
      left: { label: "Autorizar patrulhas", effects: effects(4, 1, 2, -7) },
      right: { label: "Reforçar polícia civil", effects: effects(-2, -3, -1, 6) },
    },
    ...overrides,
  };
}

export function buildFeedback(overrides = {}) {
  return {
    decision: {
      turn: 7,
      calendar: { year: 1, monthIndex: 6 },
      choice: "right",
      choiceLabel: "Reforçar polícia civil",
      speaker: buildSpeakerView(),
      metersBefore: { people: 35, market: 60, congress: 50, institutions: 12 },
      metersAfter: { people: 33, market: 57, congress: 49, institutions: 18 },
      flagChanges: [],
    },
    effects: { people: -2, market: -3, congress: -1, institutions: 6 },
    resultText: "A polícia civil recebe reforços, mas os resultados demoram a aparecer.",
    consequence: null,
    ...overrides,
  };
}
