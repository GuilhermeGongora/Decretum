// Country pack BR (playbook §3.1 and §4): real country and real institutions, fictional people.
// Plain data only. Institutional facts are labels the interface shows; no rule lives here — the engine
// receives this profile as an argument and never imports it.
export const brazil = {
  countryCode: "BR",
  playable: true,
  name: "Brasil",
  longName: "República Federativa do Brasil",
  demonym: "brasileira",
  locale: "pt-BR",
  system: "República presidencialista federativa",
  systemNote:
    "Presidencialismo de coalizão: governar exige uma base que se renegocia a cada votação.",
  summary:
    "Federação de dimensão continental, com desigualdade regional profunda, Congresso fragmentado em dezenas de partidos, imprensa combativa, Judiciário com forte poder de revisão e uma economia exposta a commodities e juros.",

  // Constitutional oath of office (Constituição de 1988, art. 78).
  oath: "Prometo manter, defender e cumprir a Constituição, observar as leis, promover o bem geral do povo brasileiro, sustentar a união, a integridade e a independência do Brasil.",

  office: {
    role: "president",
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
    votingNote: "Voto obrigatório entre 18 e 70 anos, facultativo a partir dos 16.",
    inaugurationNote: "A posse ocorre em janeiro do ano seguinte à eleição.",
  },

  powers: {
    executive: {
      name: "Poder Executivo",
      note: "Presidência, Vice-Presidência e ministérios. Edita medidas provisórias e veta projetos, sob revisão do Congresso.",
    },
    lowerHouse: {
      name: "Câmara dos Deputados",
      seats: 513,
      note: "Onde a maioria dos projetos começa e onde um pedido de impeachment é admitido ou barrado.",
    },
    upperHouse: {
      name: "Senado Federal",
      seats: 81,
      note: "Revisa projetos, aprova indicações e julga o Presidente se a Câmara autorizar.",
    },
    supremeCourt: {
      name: "Supremo Tribunal Federal",
      shortName: "STF",
      justices: 11,
      note: "Onze ministros vitalícios, indicados pela Presidência e aprovados pelo Senado. Atores independentes: não integram o gabinete e não recebem ordens do Presidente.",
    },
    federation: {
      name: "Estados e municípios",
      units: 27,
      note: "Vinte e seis estados e o Distrito Federal. Governadores negociam repasses e controlam bases parlamentares.",
    },
  },

  legislature: {
    name: "Congresso Nacional",
    note: "Bicameral: Câmara dos Deputados e Senado Federal.",
  },

  // The ministries this government holds. `name` is the short form the briefing lists; `title` is how
  // the ministry signs a document, which is what the cabinet room shows. The Casa Civil is not a
  // "Ministério da Casa Civil", so the two are declared rather than composed from a prefix.
  keyMinistries: [
    { key: "casa_civil", name: "Casa Civil", title: "Casa Civil", note: "coordenação do governo" },
    {
      key: "fazenda",
      name: "Fazenda",
      title: "Ministério da Fazenda",
      note: "política econômica e orçamento",
    },
    {
      key: "justica",
      name: "Justiça",
      title: "Ministério da Justiça",
      note: "segurança pública e ordem legal",
    },
    {
      key: "saude",
      name: "Saúde",
      title: "Ministério da Saúde",
      note: "sistema público de saúde",
    },
    {
      key: "educacao",
      name: "Educação",
      title: "Ministério da Educação",
      note: "redes de ensino e universidades",
    },
    {
      key: "defesa",
      name: "Defesa",
      title: "Ministério da Defesa",
      note: "comando civil das Forças Armadas",
    },
    {
      key: "meio_ambiente",
      name: "Meio Ambiente",
      title: "Ministério do Meio Ambiente",
      note: "clima, florestas e licenciamento",
    },
  ],

  // Who takes office with the president, and how much each one owes him. The ministries themselves
  // are the six above — this only says who sits in them, so a portfolio is never declared twice.
  // Justiça and Defesa start vacant: the cast has nobody in those chairs, and an empty chair is a
  // truthful state rather than an invented minister.
  cabinet: {
    defaultLoyalty: 60,
    // How many appointments, dismissals or replacements the Presidency may sign in one month. The
    // country owns the number; a pack with another constitutional practice may allow more.
    maxActionsPerTurn: 1,
    // A suspended president does not reorganise the government. Changes a constitutional card forces
    // still happen: those are not the Presidency acting.
    allowActionsWhileSuspended: false,
    // What reorganising the government costs, before the person involved is taken into account.
    // Signing a name calms the Congress a little and reassures the institutions; taking one down
    // costs the base far more than it buys in propriety.
    effects: {
      appoint: { congress: 1, institutions: 1 },
      dismiss: { congress: -4, institutions: 2, people: -1 },
    },
    // What the ministers who stayed lose when the president sacrifices one of them.
    dismissalLoyaltyCost: 6,
    // What each trait is worth when its owner takes office. The engine adds these up; it never knows
    // what a "fiscalista" is.
    traitEffects: {
      tecnico: { institutions: 2 },
      articulador: { congress: 3 },
      linha_dura: { institutions: 1, people: -2 },
      fiscalista: { market: 3 },
      desenvolvimentista: { market: -2, people: 3 },
      institucionalista: { institutions: 3 },
      popular: { people: 3 },
      independente: { institutions: 2, congress: -2 },
    },
    // How the engine's reading of a number is said out loud. Loyalty has its own vocabulary on
    // purpose: the Presidency is never shown the score, only how safe the person feels.
    attributeLabels: {
      competence: { low: "baixa", moderate: "moderada", high: "alta" },
      influence: { low: "baixa", moderate: "moderada", high: "alta" },
      loyalty: { wavering: "vacilante", uncertain: "incerta", loyal: "leal" },
    },
    traits: [
      { key: "tecnico", label: "Técnico" },
      { key: "articulador", label: "Articulador" },
      { key: "linha_dura", label: "Linha-dura" },
      { key: "fiscalista", label: "Fiscalista" },
      { key: "desenvolvimentista", label: "Desenvolvimentista" },
      { key: "institucionalista", label: "Institucionalista" },
      { key: "popular", label: "Popular" },
      { key: "independente", label: "Independente" },
    ],
    // Everyone the Presidency can reach for, with their attributes declared once. A holder names a
    // candidate, never a character with numbers of its own, so a minister and the person who could
    // replace him are described in exactly the same place.
    //
    // Nobody is good at everything: the competent are less loyal, the loyal are less competent, and
    // the ones with influence in Congress pay for it somewhere else.
    candidates: [
      {
        id: "casa-civil-helena",
        character: "helena-vasque",
        competence: 80,
        loyalty: 74,
        influence: 72,
        traits: ["articulador", "institucionalista"],
        biography:
          "Coordena o governo desde a posse e conhece cada voto da base pelo primeiro nome.",
      },
      {
        id: "fazenda-livia",
        character: "livia-nogueira",
        competence: 84,
        loyalty: 64,
        influence: 60,
        traits: ["fiscalista", "independente"],
        biography:
          "Economista de carreira, respeitada no mercado e pouco disposta a ceder ao Congresso.",
      },
      {
        id: "fazenda-caio",
        character: "caio-ferraz",
        competence: 68,
        loyalty: 80,
        influence: 45,
        traits: ["fiscalista", "tecnico"],
        biography:
          "Ficou no Tesouro quando perdeu a pasta e nunca deixou de atender o telefone do Planalto.",
      },
      {
        id: "saude-icaro",
        character: "icaro-nunes",
        competence: 76,
        loyalty: 58,
        influence: 44,
        traits: ["tecnico"],
        biography:
          "Sanitarista de hospital público, competente e sem qualquer paciência para política.",
      },
      {
        id: "saude-helio",
        character: "helio-barbosa",
        competence: 62,
        loyalty: 72,
        influence: 66,
        traits: ["popular", "desenvolvimentista"],
        biography:
          "Ficou conhecido coordenando mutirões no interior e tem trânsito fácil entre prefeitos.",
      },
      {
        id: "educacao-mara",
        character: "mara-vilar",
        competence: 72,
        loyalty: 66,
        influence: 50,
        traits: ["tecnico", "institucionalista"],
        biography: "Professora de rede pública que chegou ao ministério pela porta da carreira.",
      },
      {
        id: "educacao-renata",
        character: "renata-pires",
        competence: 80,
        loyalty: 55,
        influence: 40,
        traits: ["tecnico", "independente"],
        biography: "Reitora premiada, com autoridade acadêmica e pouco apetite por negociação.",
      },
      {
        id: "defesa-otavio",
        character: "otavio-leme",
        competence: 74,
        loyalty: 61,
        influence: 68,
        traits: ["linha_dura", "institucionalista"],
        biography:
          "Deixou o Estado-Maior para assumir uma pasta civil e carrega a farda em cada reunião.",
      },
      {
        id: "meio-ambiente-sofia",
        character: "sofia-amaral",
        competence: 70,
        loyalty: 70,
        influence: 38,
        traits: ["institucionalista"],
        biography: "Fiscal ambiental de carreira, discreta e inflexível quanto ao licenciamento.",
      },
      {
        id: "justica-bruno",
        character: "bruno-tavares",
        competence: 82,
        loyalty: 45,
        influence: 52,
        traits: ["institucionalista", "independente"],
        biography: "Procurador de carreira com reputação impecável e nenhuma lealdade prometida.",
      },
      {
        id: "justica-dalva",
        character: "dalva-moreno",
        competence: 64,
        loyalty: 74,
        influence: 60,
        traits: ["popular", "linha_dura"],
        biography:
          "Criminalista de tribunal do júri, popular na televisão e muito difícil de calar.",
      },
    ],
    // Who takes office with the president. Justiça is not here: it starts vacant.
    holders: [
      { portfolio: "casa_civil", candidate: "casa-civil-helena" },
      { portfolio: "fazenda", candidate: "fazenda-livia" },
      { portfolio: "saude", candidate: "saude-icaro" },
      { portfolio: "educacao", candidate: "educacao-mara" },
      { portfolio: "defesa", candidate: "defesa-otavio" },
      { portfolio: "meio_ambiente", candidate: "meio-ambiente-sofia" },
    ],
  },

  // The Supreme Court as a body that decides, not as a name that presides. Eleven justices with
  // tenure that outlives the mandate, so the Presidency neither appoints them nor commands them: the
  // bench is a composition, and only whoever speaks in a card has a face.
  //
  // It weighs what a court answers to — how documented the matter is, and how little credit the
  // presidency still has with the institutions. Hostility in parliament and a coalition falling
  // apart are the legislature's business, so no bench here declares a weight for them.
  court: {
    name: "Supremo Tribunal Federal",
    shortName: "STF",
    seats: 11,
    // A ruling needs an absolute majority of the eleven.
    majority: 6,
    presidedBy: "tomas-azevedo",
    blocs: [
      {
        key: "institutionalists",
        label: "Institucionalistas",
        share: 0.45,
        intercept: -1.4,
        weights: { evidence: 4.2, credibilityLoss: 2.2 },
      },
      {
        key: "pragmatists",
        label: "Pragmáticos",
        share: 0.36,
        intercept: -3.2,
        weights: { evidence: 3.4, publicPressure: 1.2 },
      },
      // Named by earlier governments and still grateful. They move only when the file is
      // overwhelming, which is what keeps a court from ever ruling unanimously.
      {
        key: "aligned",
        label: "Alinhados a governos anteriores",
        share: 0.19,
        intercept: -5.2,
        weights: { evidence: 2.0 },
      },
    ],
    // What can reach the bench, and what it costs when the court decides against the government.
    // The same shape the removal grounds use: the country names the flags, the engine only matches.
    matters: [
      {
        key: "records_withheld",
        label: "Recusa de entregar documentos ao Tribunal",
        weight: 38,
        flags: ["documents_withheld", "palace_secrecy_kept"],
        ruledFlag: "court_ruled_records",
        effects: { institutions: 6, congress: -3, market: -1 },
        setFlags: ["court_ruled_against"],
      },
      {
        key: "data_registry",
        label: "Limites do cadastro nacional de dados",
        weight: 26,
        flags: ["national_data_registry"],
        ruledFlag: "court_ruled_data",
        effects: { institutions: 4, market: -2 },
        setFlags: ["court_ruled_against"],
      },
      {
        key: "emergency_contracts",
        label: "Contratação sem licitação",
        weight: 30,
        flags: ["emergency_procurement", "questioned_contractor"],
        ruledFlag: "court_ruled_contracts",
        effects: { institutions: 5, market: -3, people: -1 },
        setFlags: ["court_ruled_against"],
      },
      {
        key: "press_pressure",
        label: "Pressão do Palácio sobre a imprensa",
        weight: 34,
        flags: ["press_intimidated"],
        ruledFlag: "court_ruled_press",
        effects: { institutions: 7, people: 2, congress: -2 },
        setFlags: ["court_ruled_against"],
      },
    ],
  },

  // Impeachment as the Constitution describes it (art. 51, 52 and 86): the Chamber authorises by two
  // thirds, the Senate opens the trial by an absolute majority and suspends the president for up to
  // 180 days, and conviction needs two thirds of the senators. The thresholds live here, in the
  // country pack — the engine only compares numbers it was handed.
  removal: {
    type: "impeachment",
    note: "Denúncia protocolada na Câmara, autorização por dois terços, instauração e julgamento no Senado, com afastamento de até 180 dias.",
    chamber: {
      name: "Câmara dos Deputados",
      seats: 513,
      authorizationVotes: 342,
      presidedBy: "celina-braga",
      // How the house divides when it is asked to authorise a removal. Shares sum to 1; the engine
      // apportions the seats. `intercept` is where a bloc rests when nothing is happening, and the
      // weights are what it will move for. The loyal fifth of the house sits so far below its
      // tipping point that no accumulation of pressure carries it, which is what keeps a Brazilian
      // chamber from ever voting 492 to 21.
      // Evidence is the heaviest weight in every bloc but the opposition: a hostile chamber that has
      // nothing to accuse the president of does not reach two thirds, which is the difference between
      // a political grievance and an impeachable act.
      blocs: [
        {
          key: "government_base",
          label: "Base fiel",
          share: 0.2,
          intercept: -4.6,
          weights: { cohesionLoss: 2.2, evidence: 2.4 },
        },
        {
          key: "pragmatic_coalition",
          label: "Coalizão pragmática",
          share: 0.26,
          intercept: -3,
          weights: { cohesionLoss: 2.8, hostility: 1.2, evidence: 3, publicPressure: 0.9 },
        },
        {
          key: "independent_centre",
          label: "Centro independente",
          share: 0.22,
          intercept: -2,
          weights: { evidence: 3.6, publicPressure: 2.2, hostility: 1 },
        },
        {
          key: "opposition",
          label: "Oposição",
          share: 0.24,
          intercept: 0.9,
          weights: { evidence: 1.8, publicPressure: 0.9 },
        },
        {
          key: "institutionalists",
          label: "Bancada institucionalista",
          share: 0.08,
          intercept: -2.2,
          weights: { evidence: 5, credibilityLoss: 2 },
        },
      ],
    },
    senate: {
      name: "Senado Federal",
      seats: 81,
      admissibilityVotes: 41,
      convictionVotes: 54,
      presidedBy: "tomas-azevedo",
      presidedByNote: "O julgamento é presidido pelo Presidente do Supremo Tribunal Federal.",
      // The upper house is the more institutional of the two: a larger bench answers to the record
      // rather than to the streets, and a loyal base plus a pragmatic coalition hold 47% of it. The
      // two thirds a conviction needs can only be reached when the evidence carries the centre and
      // the institutionalists at once, which is what makes removal rare and admissibility common.
      blocs: [
        {
          key: "government_base",
          label: "Base fiel",
          share: 0.22,
          intercept: -4.4,
          weights: { cohesionLoss: 2, evidence: 2.2 },
        },
        {
          key: "pragmatic_coalition",
          label: "Coalizão pragmática",
          share: 0.25,
          intercept: -3.2,
          weights: { cohesionLoss: 2.6, hostility: 1.1, evidence: 3.2, publicPressure: 0.8 },
        },
        {
          key: "independent_centre",
          label: "Centro independente",
          share: 0.21,
          intercept: -2.2,
          weights: { evidence: 4, publicPressure: 1.9, hostility: 0.9 },
        },
        {
          key: "opposition",
          label: "Oposição",
          share: 0.21,
          intercept: 0.7,
          weights: { evidence: 2, publicPressure: 0.8 },
        },
        {
          key: "institutionalists",
          label: "Bancada institucionalista",
          share: 0.11,
          intercept: -2.4,
          weights: { evidence: 5.2, credibilityLoss: 2.2 },
        },
      ],
    },
    // 180 days of suspension, read on the game's calendar of one month per turn.
    suspensionTurns: 6,
    filedBy: "andre-furtado",
    // Links the deck cannot schedule by itself, because only a count, an opening or an outcome knows
    // where the process lands. Naming them here keeps every card slug out of the engine.
    cards: {
      grounds_emerging: "impeachment_grounds",
      senate_admissibility: "impeachment_senate_admissibility",
      suspended: "impeachment_suspension",
      senate_trial: "impeachment_trial",
      archived: "impeachment_shelved",
      acquitted: "impeachment_acquittal",
    },
    stages: [
      { key: "grounds_emerging", label: "Fundamento em formação", note: "Indícios reunidos" },
      { key: "petition_filed", label: "Denúncia protocolada", note: "Pedido na Câmara" },
      {
        key: "speaker_review",
        label: "Análise da Presidência da Câmara",
        note: "Admitir ou arquivar",
      },
      { key: "chamber_campaign", label: "Articulação na Câmara", note: "Contagem de votos" },
      { key: "chamber_vote", label: "Votação na Câmara", note: "342 de 513 autorizam" },
      { key: "senate_admissibility", label: "Instauração no Senado", note: "41 de 81 instauram" },
      { key: "suspended", label: "Presidência afastada", note: "Até seis meses" },
      { key: "senate_trial", label: "Julgamento no Senado", note: "54 de 81 condenam" },
    ],
    resolutions: [
      { key: "archived", label: "Pedido arquivado" },
      { key: "acquitted", label: "Absolvição" },
      { key: "removed", label: "Perda do cargo" },
      { key: "expired", label: "Processo extinto com o mandato" },
    ],
    // What counts as grounds, and which decisions of this government evidence them. The engine reads
    // the flags; it never knows what any of them mean.
    grounds: [
      {
        key: "audit_cover_up",
        label: "Obstrução de auditoria",
        weight: 34,
        flags: ["audit_ignored"],
      },
      {
        key: "cabinet_bargain",
        label: "Barganha de ministérios",
        weight: 26,
        flags: ["campaign_cabinet_promised", "agencies_shared"],
      },
      {
        key: "dossier_abuse",
        label: "Uso de dossiê contra adversários",
        weight: 30,
        flags: ["campaign_dossier_used", "press_intimidated"],
      },
      {
        key: "contract_scandal",
        label: "Contratos sob suspeita",
        weight: 32,
        flags: ["questioned_contractor", "emergency_procurement"],
      },
      {
        key: "court_defiance",
        label: "Descumprimento de decisão judicial",
        weight: 38,
        flags: ["palace_secrecy_kept", "documents_withheld"],
      },
    ],
  },

  // Interface vocabulary. The four pillars keep their engine keys; only the labels are localized.
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

  // Fictional people and parties in real institutions (playbook §3.1).
  candidateOptions: {
    // The neutral form comes first: the default must not gender the name the player just typed.
    treatments: [
      { key: "neutro", label: "Presidência" },
      { key: "senhor", label: "Senhor Presidente" },
      { key: "senhora", label: "Senhora Presidenta" },
    ],
    origins: [
      {
        key: "sindical",
        label: "Origem sindical",
        note: "Anos de negociação coletiva e greve.",
        meters: { people: 4, market: -3 },
        flags: ["origin_labour"],
      },
      {
        key: "empresarial",
        label: "Origem empresarial",
        note: "Veio da indústria e do mercado financeiro.",
        meters: { market: 4, people: -3 },
        flags: ["origin_business"],
      },
      {
        key: "judiciaria",
        label: "Carreira jurídica",
        note: "Promotoria, controle e combate à corrupção.",
        meters: { institutions: 4, congress: -3 },
        flags: ["origin_legal"],
      },
      {
        key: "parlamentar",
        label: "Carreira parlamentar",
        note: "Décadas de articulação no Congresso.",
        meters: { congress: 4, institutions: -3 },
        flags: ["origin_congress"],
      },
      {
        key: "estadual",
        label: "Governo estadual",
        note: "Administrou um estado e conhece o federalismo por dentro.",
        meters: { congress: 2, people: 2, market: -1 },
        flags: ["origin_governor"],
      },
    ],
    styles: [
      {
        key: "conciliador",
        label: "Conciliador",
        note: "Negocia antes de decidir.",
        meters: { congress: 3, people: -1 },
        flags: ["style_conciliator"],
      },
      {
        key: "tecnico",
        label: "Técnico",
        note: "Decide por dados e planilhas.",
        meters: { market: 3, people: -1 },
        flags: ["style_technocrat"],
      },
      {
        key: "confrontador",
        label: "Confrontador",
        note: "Enfrenta quem atrapalha, custe o que custar.",
        meters: { people: 3, institutions: -2 },
        flags: ["style_confrontational"],
      },
      {
        key: "institucional",
        label: "Institucional",
        note: "Trata o rito e a lei como limite inegociável.",
        meters: { institutions: 3, congress: -1 },
        flags: ["style_institutional"],
      },
    ],
    parties: [
      { key: "pcn", name: "Partido Cívico Nacional", acronym: "PCN", lean: "centro" },
      { key: "fnt", name: "Frente Nacional do Trabalho", acronym: "FNT", lean: "centro-esquerda" },
      { key: "usd", name: "União Social Democrática", acronym: "USD", lean: "centro" },
      { key: "pop", name: "Partido da Ordem Produtiva", acronym: "POP", lean: "centro-direita" },
    ],
    coalitions: [
      {
        key: "ampla",
        label: "Coligação Brasil de Pé",
        note: "Nove partidos, muitas promessas de cargo.",
        meters: { congress: 4, institutions: -2 },
        flags: ["broad_coalition"],
      },
      {
        key: "programatica",
        label: "Frente pela Reconstrução",
        note: "Três partidos com programa comum.",
        meters: { congress: 1, people: 2 },
        flags: ["programmatic_coalition"],
      },
      {
        key: "minima",
        label: "Aliança mínima",
        note: "Campanha quase sozinha, sem dívidas de palanque.",
        meters: { institutions: 3, congress: -4 },
        flags: ["minimal_coalition"],
      },
    ],
    promises: [
      {
        key: "fiscal",
        label: "Responsabilidade fiscal",
        note: "Equilibrar as contas antes de tudo.",
        meters: { market: 4, people: -2 },
        flags: ["pledge_fiscal"],
      },
      {
        key: "social",
        label: "Expansão social",
        note: "Creches, saúde e renda mínima.",
        meters: { people: 4, market: -3 },
        flags: ["pledge_social"],
      },
      {
        key: "seguranca",
        label: "Segurança pública",
        note: "Enfrentar o crime organizado.",
        meters: { people: 2, institutions: -1 },
        flags: ["pledge_security"],
      },
      {
        key: "integridade",
        label: "Combate à corrupção",
        note: "Nenhum acordo com quem desvia.",
        meters: { institutions: 4, congress: -3 },
        flags: ["pledge_integrity"],
      },
    ],
  },

  campaign: {
    opponent: {
      name: "Senador Everaldo Brandão",
      party: "Movimento Republicano Popular",
      acronym: "MRP",
      note: "Três mandatos no Senado, apoio das bancadas do agronegócio e das igrejas.",
    },
    electorate: 158_400_000,
    baseShare: 44.6,
    baseTurnout: 76.8,
    validVoteRate: 0.93,
    // The second round, as this country's arithmetic. `base` is what a campaign that ended the first
    // round exactly at `baseShare` consolidates; `slope` is how much of every extra point it carries
    // across. Below 50 the candidacy loses — a first round far under the threshold does not come
    // back from it, and refusing every deal is a way of getting there.
    runoff: { base: 49.2, slope: 0.42 },
    questions: [
      {
        id: "economy_debate",
        kicker: "Debate na TV · Setembro",
        text: "O mediador pergunta o que você fará no primeiro mês: cortar gastos para acalmar o mercado ou ampliar programas sociais.",
        options: {
          left: {
            id: "austerity",
            label: "Prometer ajuste",
            note: "Compromisso público com corte de despesas.",
            share: 1.4,
            turnout: -0.6,
            meters: { market: 5, people: -3 },
            flags: ["campaign_austerity_pledge"],
            regions: { Sudeste: 3, Sul: 2 },
          },
          right: {
            id: "expansion",
            label: "Prometer expansão",
            note: "Compromisso público com mais gasto social.",
            share: 2.6,
            turnout: 1.2,
            meters: { people: 5, market: -4 },
            flags: ["campaign_spending_pledge"],
            regions: { Nordeste: 4, Norte: 2 },
          },
        },
      },
      {
        id: "coalition_deal",
        kicker: "Reunião reservada · Outubro",
        text: "Três partidos do centro oferecem tempo de televisão e palanque estadual. Em troca, querem ministérios definidos antes da eleição.",
        options: {
          left: {
            id: "accept_deal",
            label: "Aceitar o acordo",
            note: "Pastas prometidas antes da apuração.",
            share: 3.2,
            turnout: 0.4,
            meters: { congress: 6, institutions: -4 },
            flags: ["campaign_cabinet_promised"],
            regions: { "Centro-Oeste": 2, Sudeste: 2 },
          },
          right: {
            id: "refuse_deal",
            label: "Recusar o acordo",
            note: "Nenhum ministério negociado no palanque.",
            share: -1.2,
            turnout: -0.3,
            meters: { institutions: 5, congress: -5 },
            flags: ["campaign_no_cabinet_deal"],
            regions: { Sudeste: 1 },
          },
        },
      },
      {
        id: "opponent_scandal",
        kicker: "Dossiê anônimo · Outubro",
        text: "Chega à campanha um dossiê com indícios contra o adversário. A origem do material é desconhecida.",
        options: {
          left: {
            id: "use_dossier",
            label: "Divulgar o dossiê",
            note: "O material vai ao ar na reta final.",
            share: 2.8,
            turnout: -1.4,
            meters: { people: 3, institutions: -5 },
            flags: ["campaign_dossier_used"],
            regions: { Sudeste: 2, Sul: 1 },
          },
          right: {
            id: "reject_dossier",
            label: "Recusar o material",
            note: "A campanha entrega o dossiê às autoridades.",
            share: -0.4,
            turnout: 0.2,
            meters: { institutions: 6, people: -1 },
            flags: ["campaign_clean_hands"],
            regions: { Sul: 1 },
          },
        },
      },
      {
        id: "final_stretch",
        kicker: "Última semana · Outubro",
        text: "Resta uma semana e uma agenda: um comício nacional com movimentos sociais ou uma rodada com investidores e editoriais.",
        options: {
          left: {
            id: "street_rally",
            label: "Ir às ruas",
            note: "Comício final com as centrais e movimentos.",
            share: 2.2,
            turnout: 2.4,
            meters: { people: 5, market: -3 },
            flags: ["campaign_street_mandate"],
            regions: { Nordeste: 3, Norte: 2 },
          },
          right: {
            id: "market_round",
            label: "Falar ao mercado",
            note: "Encontros fechados com investidores e jornais.",
            share: 1.2,
            turnout: -0.8,
            meters: { market: 5, congress: 2, people: -2 },
            flags: ["campaign_market_trust"],
            regions: { Sudeste: 4, Sul: 1 },
          },
        },
      },
      {
        id: "environment_debate",
        kicker: "Sabatina ambiental · Setembro",
        text: "Uma estrada cortaria floresta protegida e abriria escoamento para três estados. Perguntam se você licencia a obra ou mantém a fiscalização como está.",
        options: {
          left: {
            id: "promise_licensing",
            label: "Prometer o licenciamento",
            note: "Obra liberada no primeiro ano de governo.",
            share: 2.0,
            turnout: 0.2,
            meters: { market: 4, people: 1, institutions: -4 },
            flags: ["campaign_licensing_promised"],
            regions: { Norte: 3, "Centro-Oeste": 3 },
          },
          right: {
            id: "defend_enforcement",
            label: "Defender a fiscalização",
            note: "Nenhuma flexibilização prometida no palanque.",
            share: -0.8,
            turnout: 0.6,
            meters: { institutions: 5, market: -3 },
            flags: ["campaign_environment_pledge"],
            regions: { Sudeste: 2, Sul: 1 },
          },
        },
      },
    ],
    // Authored, never generated at runtime: the resolver picks by margin band.
    headlines: [
      {
        minMargin: 14,
        text: "Vitória folgada no primeiro turno dá à Presidência eleita o maior mandato popular em uma década",
        summary: "A margem larga cria autoridade, e todos os aliados já cobram a fatura.",
      },
      {
        minMargin: 10,
        text: "Presidência eleita com ampla maioria promete governar sem depender de um centro fragmentado",
        summary: "A margem dá fôlego, e o Congresso eleito ainda cobra cadeira por cadeira.",
      },
      {
        minMargin: 6,
        text: "Presidência eleita com margem confortável promete governar com o Congresso que acabou de enfrentar",
        summary: "A vitória é clara, mas o Congresso eleito é mais fragmentado que a coligação.",
      },
      {
        minMargin: 2,
        text: "País elege nova Presidência por margem apertada e abre mandato sob contestação",
        summary: "Metade do país votou no outro lado, e a oposição já fala em maioria bloqueadora.",
      },
      {
        minMargin: 0,
        text: "Apuração decidida nas últimas urnas define a Presidência por diferença mínima",
        summary:
          "A diferença cabe em uma capital. Governar exigirá concessões desde o primeiro mês.",
      },
      // Below zero the candidacy lost. The bands stay in descending order, because the resolver
      // takes the first one the margin reaches.
      {
        minMargin: -3,
        text: "Segundo turno termina sem mandato para a candidatura, por diferença de menos de dois pontos",
        summary: "Faltou pouco, e o pouco que faltou foi recusado na campanha.",
      },
      {
        minMargin: -8,
        text: "Candidatura é derrotada no segundo turno e a oposição chega ao Palácio com folga",
        summary:
          "A diferença passou de quatro pontos, e o discurso da virada não convenceu ninguém.",
      },
      {
        minMargin: -100,
        text: "Oposição confirma o segundo turno com folga e assume o Palácio no ano que vem",
        summary: "A derrota foi ampla, e a campanha terminou sem o apoio que recusou negociar.",
      },
    ],
  },
};
