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

  keyMinistries: [
    { key: "casa_civil", name: "Casa Civil", note: "coordenação do governo" },
    { key: "fazenda", name: "Fazenda", note: "política econômica e orçamento" },
    { key: "justica", name: "Justiça", note: "segurança pública e ordem legal" },
    { key: "saude", name: "Saúde", note: "sistema público de saúde" },
    { key: "educacao", name: "Educação", note: "redes de ensino e universidades" },
    { key: "defesa", name: "Defesa", note: "comando civil das Forças Armadas" },
  ],

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
    ],
    // Authored, never generated at runtime: the resolver picks by margin band.
    headlines: [
      {
        minMargin: 14,
        text: "Vitória folgada no primeiro turno dá à Presidência eleita o maior mandato popular em uma década",
        summary: "A margem larga cria autoridade, e todos os aliados já cobram a fatura.",
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
    ],
  },
};
