import {
  applyCabinetAction,
  applyCabinetOperations,
  createCabinet,
  findSeat,
  restoreCabinet,
  toPublicAttributes,
} from "@/src/domain/cabinet";

// A synthetic country: the cabinet rules have to hold for any pack, so this never reads Brazilian
// content. Three ministries are enough to show the order a tie is broken by.
function buildCountry(overrides = {}) {
  return {
    keyMinistries: [
      { key: "casa_civil", name: "Casa Civil", note: "coordenação do governo" },
      { key: "fazenda", name: "Fazenda", note: "orçamento" },
      { key: "justica", name: "Justiça", note: "ordem legal" },
    ],
    // A candidate carries the person and the numbers; a holder only says who sits where. The engine
    // needs nothing else from a candidate, which is why this fixture declares nothing else.
    cabinet: {
      defaultLoyalty: 60,
      candidates: [
        { id: "cc-helena", character: "helena-vasque", loyalty: 72 },
        { id: "fz-caio", character: "caio-ferraz", loyalty: 48 },
      ],
      holders: [
        { portfolio: "casa_civil", candidate: "cc-helena" },
        { portfolio: "fazenda", candidate: "fz-caio" },
      ],
    },
    ...overrides,
  };
}

describe("createCabinet", () => {
  it("gives the government one seat per ministry the country declares", () => {
    const cabinet = createCabinet(buildCountry());

    expect(cabinet.seats.map((seat) => seat.portfolio)).toEqual([
      "casa_civil",
      "fazenda",
      "justica",
    ]);
  });

  it("seats the holder the country names, with the loyalty it gives them", () => {
    const cabinet = createCabinet(buildCountry());

    expect(findSeat(cabinet, "casa_civil")).toEqual({
      portfolio: "casa_civil",
      name: "Casa Civil",
      holder: "helena-vasque",
      loyalty: 72,
      sinceTurn: 1,
    });
  });

  it("leaves a portfolio nobody was named for vacant", () => {
    expect(findSeat(createCabinet(buildCountry()), "justica")).toMatchObject({
      holder: null,
      loyalty: null,
    });
  });

  it("falls back to the pack's default loyalty when a candidate declares none", () => {
    const country = buildCountry({
      cabinet: {
        defaultLoyalty: 55,
        candidates: [{ id: "fz-caio", character: "caio-ferraz" }],
        holders: [{ portfolio: "fazenda", candidate: "fz-caio" }],
      },
    });

    expect(findSeat(createCabinet(country), "fazenda").loyalty).toBe(55);
  });

  it("ignores a holder named for a ministry the country does not declare", () => {
    const country = buildCountry({
      cabinet: {
        defaultLoyalty: 60,
        candidates: [{ id: "df-otavio", character: "otavio-leme" }],
        holders: [{ portfolio: "defesa", candidate: "df-otavio" }],
      },
    });

    expect(createCabinet(country).seats).toHaveLength(3);
    expect(findSeat(createCabinet(country), "defesa")).toBeNull();
  });

  it("is empty for a country that declares no ministries", () => {
    expect(createCabinet({}).seats).toEqual([]);
  });
});

describe("findSeat", () => {
  it("returns null for a portfolio the cabinet does not hold", () => {
    expect(findSeat(createCabinet(buildCountry()), "defesa")).toBeNull();
  });
});

describe("when a choice hands a minister over", () => {
  const handOver = { cabinet: { dismiss: "most_exposed" } };

  it("dismisses the least loyal minister in office", () => {
    const { cabinet, changes } = applyCabinetOperations(
      createCabinet(buildCountry()),
      handOver,
      12,
    );

    expect(findSeat(cabinet, "fazenda")).toMatchObject({ holder: null, loyalty: null });
    expect(changes).toEqual([
      {
        type: "dismissed",
        portfolio: "fazenda",
        name: "Fazenda",
        holder: "caio-ferraz",
        loyalty: 48,
        turn: 12,
      },
    ]);
  });

  it("leaves every other minister in office", () => {
    const { cabinet } = applyCabinetOperations(createCabinet(buildCountry()), handOver, 12);

    expect(findSeat(cabinet, "casa_civil").holder).toBe("helena-vasque");
  });

  it("breaks a tie by the order the country declares its ministries", () => {
    const country = buildCountry({
      cabinet: {
        defaultLoyalty: 60,
        candidates: [
          { id: "fz-caio", character: "caio-ferraz", loyalty: 40 },
          { id: "cc-helena", character: "helena-vasque", loyalty: 40 },
        ],
        holders: [
          { portfolio: "fazenda", candidate: "fz-caio" },
          { portfolio: "casa_civil", candidate: "cc-helena" },
        ],
      },
    });

    const { changes } = applyCabinetOperations(createCabinet(country), handOver, 12);

    expect(changes[0].portfolio).toBe("casa_civil");
  });

  it("has nobody to hand over when every seat is already vacant", () => {
    const country = buildCountry({ cabinet: { defaultLoyalty: 60, candidates: [], holders: [] } });
    const empty = createCabinet(country);

    const { cabinet, changes } = applyCabinetOperations(empty, handOver, 12);

    expect(changes).toEqual([]);
    expect(cabinet).toEqual(empty);
  });

  it("costs the ministers who stayed the loyalty the choice names", () => {
    const { cabinet } = applyCabinetOperations(
      createCabinet(buildCountry()),
      { cabinet: { dismiss: "most_exposed", loyalty: -10 } },
      12,
    );

    expect(findSeat(cabinet, "casa_civil").loyalty).toBe(62);
  });

  it("never lets loyalty leave its bounds", () => {
    const country = buildCountry({
      cabinet: {
        defaultLoyalty: 60,
        candidates: [{ id: "cc-helena", character: "helena-vasque", loyalty: 4 }],
        holders: [{ portfolio: "casa_civil", candidate: "cc-helena" }],
      },
    });

    const { cabinet } = applyCabinetOperations(
      createCabinet(country),
      { cabinet: { loyalty: -20 } },
      12,
    );

    expect(findSeat(cabinet, "casa_civil").loyalty).toBe(0);
  });

  it("does not mutate the cabinet it was given", () => {
    const before = createCabinet(buildCountry());

    applyCabinetOperations(before, handOver, 12);

    expect(findSeat(before, "fazenda").holder).toBe("caio-ferraz");
  });
});

describe("when a choice says nothing about the cabinet", () => {
  it("returns the same cabinet and reports no change", () => {
    const cabinet = createCabinet(buildCountry());

    expect(applyCabinetOperations(cabinet, {}, 12)).toEqual({ cabinet, changes: [] });
  });
});

describe("restoreCabinet", () => {
  const stored = [
    { portfolio: "casa_civil", holder: "helena-vasque", loyalty: 64, sinceTurn: 1 },
    { portfolio: "justica", holder: "mara-vilar", loyalty: 51, sinceTurn: 9 },
  ];

  it("rebuilds the ministries the country declares, in the country's own order", () => {
    const cabinet = restoreCabinet(buildCountry(), stored);

    expect(cabinet.seats.map((seat) => seat.portfolio)).toEqual([
      "casa_civil",
      "fazenda",
      "justica",
    ]);
  });

  it("keeps the holder, the loyalty and the month the seat was last settled", () => {
    expect(findSeat(restoreCabinet(buildCountry(), stored), "justica")).toEqual({
      portfolio: "justica",
      name: "Justiça",
      holder: "mara-vilar",
      loyalty: 51,
      sinceTurn: 9,
    });
  });

  // The whole point of persisting the cabinet: a minister who was handed over stays gone. Falling
  // back to the country's initial holder here would quietly put him back in office next month.
  it("leaves a ministry with no stored seat vacant instead of seating its first holder again", () => {
    const cabinet = restoreCabinet(buildCountry(), stored);

    expect(findSeat(cabinet, "fazenda")).toMatchObject({ holder: null, loyalty: null });
  });

  it("drops a stored seat for a ministry the country no longer declares", () => {
    const cabinet = restoreCabinet(buildCountry(), [
      ...stored,
      { portfolio: "turismo", holder: "caio-ferraz", loyalty: 80, sinceTurn: 3 },
    ]);

    expect(cabinet.seats).toHaveLength(3);
    expect(findSeat(cabinet, "turismo")).toBeNull();
  });

  // A government that predates the cabinet table has stored nothing at all. It takes office with the
  // one the country describes, rather than with a row of empty chairs.
  it("gives the country's starting cabinet to a government that never stored one", () => {
    const country = buildCountry();

    expect(restoreCabinet(country, [])).toEqual(createCabinet(country));
  });

  // A pack may gain a ministry between one month and the next. The new chair arrives empty, and the
  // seats already stored are left exactly as the government left them.
  it("gives a ministry declared later an empty chair, disturbing no stored seat", () => {
    const grown = buildCountry({
      keyMinistries: [
        ...buildCountry().keyMinistries,
        { key: "meio_ambiente", name: "Meio Ambiente", note: "clima e florestas" },
      ],
    });

    const cabinet = restoreCabinet(grown, stored);

    expect(cabinet.seats).toHaveLength(4);
    expect(findSeat(cabinet, "meio_ambiente")).toMatchObject({ holder: null, loyalty: null });
    expect(findSeat(cabinet, "casa_civil")).toMatchObject({ holder: "helena-vasque", loyalty: 64 });
    expect(findSeat(cabinet, "justica")).toMatchObject({ holder: "mara-vilar", sinceTurn: 9 });
  });

  // The ministry the government emptied stays empty even as the pack grows around it.
  it("does not refill an emptied ministry when another one is added to the pack", () => {
    const grown = buildCountry({
      keyMinistries: [
        ...buildCountry().keyMinistries,
        { key: "meio_ambiente", name: "Meio Ambiente", note: "clima e florestas" },
      ],
    });

    expect(findSeat(restoreCabinet(grown, stored), "fazenda")).toMatchObject({ holder: null });
  });
});

// The Presidency reorganising its own government. Content is passed in as an argument, the way the
// engine already receives cards and the country: the domain reads the registry, it never imports it.
describe("toPublicAttributes", () => {
  it("reads competence and influence plainly", () => {
    expect(toPublicAttributes({ competence: 82, influence: 20 })).toMatchObject({
      competence: "high",
      influence: "low",
    });
  });

  // Loyalty gets its own, vaguer vocabulary: a president is never handed the number.
  it("never says loyalty in the language of a score", () => {
    const attributes = toPublicAttributes({ competence: 50, loyalty: 50, influence: 50 });

    expect(attributes.loyalty).toBe("uncertain");
    expect(["low", "moderate", "high"]).not.toContain(attributes.loyalty);
  });

  it.each([
    [39, "low", "wavering"],
    [40, "moderate", "uncertain"],
    [69, "moderate", "uncertain"],
    [70, "high", "loyal"],
    [100, "high", "loyal"],
    [0, "low", "wavering"],
  ])("reads %i as %s competence and %s loyalty", (value, competence, loyalty) => {
    expect(toPublicAttributes({ competence: value, loyalty: value })).toMatchObject({
      competence,
      loyalty,
    });
  });

  it("says nothing about an attribute nobody declared", () => {
    expect(toPublicAttributes({ competence: 70 })).toEqual({
      competence: "high",
      loyalty: null,
      influence: null,
    });
  });

  it("says nothing at all about an empty chair", () => {
    expect(toPublicAttributes()).toEqual({ competence: null, loyalty: null, influence: null });
  });

  // The whole point: no number ever leaves through this door.
  it("returns words, never the score behind them", () => {
    for (const value of Object.values(toPublicAttributes({ competence: 82, loyalty: 45 }))) {
      expect(typeof value === "string" || value === null).toBe(true);
    }
  });
});

describe("applyCabinetAction", () => {
  const registry = {
    "helena-vasque": {
      name: "Helena Vasque",
      cabinet: { eligible: true, ministries: ["casa_civil"] },
    },
    "caio-ferraz": { name: "Caio Ferraz", cabinet: { eligible: true, ministries: ["fazenda"] } },
    "livia-nogueira": {
      name: "Lívia Nogueira",
      cabinet: { eligible: true, ministries: ["fazenda"] },
    },
    "bruno-tavares": {
      name: "Bruno Tavares",
      cabinet: { eligible: true, ministries: ["justica"] },
    },
    "tomas-azevedo": {
      name: "Tomás Azevedo",
      cabinet: { eligible: false, reason: "Preside o Supremo" },
    },
  };

  function actionCountry(overrides = {}) {
    return buildCountry({
      cabinet: {
        defaultLoyalty: 60,
        maxActionsPerTurn: 1,
        allowActionsWhileSuspended: false,
        // Every consequence is declared by the country or carried by the candidate. The engine adds
        // them up; it never knows what a "fiscalista" is.
        effects: {
          appoint: { congress: 1, institutions: 1 },
          dismiss: { congress: -3, institutions: 2, people: -1 },
        },
        dismissalLoyaltyCost: 6,
        traitEffects: { fiscalista: { market: 3 }, popular: { people: 2 } },
        candidates: [
          { id: "cc-helena", character: "helena-vasque", loyalty: 72 },
          { id: "fz-caio", character: "caio-ferraz", loyalty: 48, traits: ["fiscalista"] },
          { id: "fz-livia", character: "livia-nogueira", loyalty: 64, traits: ["fiscalista"] },
          { id: "jz-bruno", character: "bruno-tavares", loyalty: 45, traits: ["popular"] },
          { id: "jz-tomas", character: "tomas-azevedo", loyalty: 90 },
        ],
        holders: [
          { portfolio: "casa_civil", candidate: "cc-helena" },
          { portfolio: "fazenda", candidate: "fz-caio" },
        ],
        ...overrides,
      },
    });
  }

  const context = (overrides = {}) => ({
    country: actionCountry(),
    characters: registry,
    turn: 12,
    actionsUsedThisTurn: 0,
    suspended: false,
    ...overrides,
  });

  const act = (request, overrides = {}) =>
    applyCabinetAction(createCabinet(actionCountry()), request, context(overrides));

  describe("appointing to an empty chair", () => {
    const appoint = { action: "appoint", ministryKey: "justica", candidateId: "jz-bruno" };

    it("seats the candidate with the loyalty the pack gives them, from this month on", () => {
      const { cabinet } = act(appoint);

      expect(findSeat(cabinet, "justica")).toMatchObject({
        holder: "bruno-tavares",
        loyalty: 45,
        sinceTurn: 12,
      });
    });

    it("records what changed, with no previous holder", () => {
      const { action } = act(appoint);

      expect(action).toMatchObject({
        turn: 12,
        action: "appoint",
        ministryKey: "justica",
        previousCharacterId: null,
        nextCharacterId: "bruno-tavares",
      });
    });

    it("adds the country's cost to the traits the new minister brings", () => {
      const { effects } = act(appoint);

      // appoint: congress +1, institutions +1; popular: people +2.
      expect(effects).toEqual({ people: 2, market: 0, congress: 1, institutions: 1 });
    });

    it("refuses a ministry that already has a holder", () => {
      const attempt = () =>
        act({ action: "appoint", ministryKey: "fazenda", candidateId: "fz-livia" });

      expect(attempt).toThrow(expect.objectContaining({ code: "MINISTRY_ALREADY_HELD" }));
    });

    it("refuses a candidate the registry allows nowhere near a ministry", () => {
      const attempt = () =>
        act({ action: "appoint", ministryKey: "justica", candidateId: "jz-tomas" });

      expect(attempt).toThrow(expect.objectContaining({ code: "CANDIDATE_NOT_ELIGIBLE" }));
    });

    it("refuses a candidate the registry allows only in another ministry", () => {
      const attempt = () =>
        act({ action: "appoint", ministryKey: "justica", candidateId: "fz-livia" });

      expect(attempt).toThrow(expect.objectContaining({ code: "CANDIDATE_NOT_ELIGIBLE" }));
    });

    it("refuses a candidate the pack never declared", () => {
      const attempt = () =>
        act({ action: "appoint", ministryKey: "justica", candidateId: "ghost" });

      expect(attempt).toThrow(expect.objectContaining({ code: "UNKNOWN_CANDIDATE" }));
    });

    it("refuses a ministry the country does not declare", () => {
      const attempt = () =>
        act({ action: "appoint", ministryKey: "turismo", candidateId: "jz-bruno" });

      expect(attempt).toThrow(expect.objectContaining({ code: "UNKNOWN_MINISTRY" }));
    });
  });

  describe("dismissing a minister", () => {
    const dismiss = { action: "dismiss", ministryKey: "fazenda" };

    it("empties the chair and remembers who was in it", () => {
      const { cabinet, action } = act(dismiss);

      expect(findSeat(cabinet, "fazenda")).toMatchObject({ holder: null, loyalty: null });
      expect(action).toMatchObject({
        action: "dismiss",
        previousCharacterId: "caio-ferraz",
        nextCharacterId: null,
      });
    });

    it("costs the ministers who stayed the loyalty the country charges", () => {
      const { cabinet } = act(dismiss);

      expect(findSeat(cabinet, "casa_civil").loyalty).toBe(66);
    });

    it("carries only the country's cost, never the outgoing minister's traits", () => {
      const { effects } = act(dismiss);

      expect(effects).toEqual({ people: -1, market: 0, congress: -3, institutions: 2 });
    });

    it("refuses a chair that is already empty", () => {
      const attempt = () => act({ action: "dismiss", ministryKey: "justica" });

      expect(attempt).toThrow(expect.objectContaining({ code: "MINISTRY_ALREADY_VACANT" }));
    });
  });

  describe("replacing a minister", () => {
    const replace = { action: "replace", ministryKey: "fazenda", candidateId: "fz-livia" };

    it("removes one and seats the other in the same breath", () => {
      const { cabinet, action } = act(replace);

      expect(findSeat(cabinet, "fazenda")).toMatchObject({
        holder: "livia-nogueira",
        loyalty: 64,
        sinceTurn: 12,
      });
      expect(action).toMatchObject({
        action: "replace",
        previousCharacterId: "caio-ferraz",
        nextCharacterId: "livia-nogueira",
      });
    });

    it("pays for the dismissal and the appointment together", () => {
      const { effects } = act(replace);

      // dismiss (-1/0/-3/+2) + appoint (0/0/+1/+1) + fiscalista (0/+3/0/0).
      expect(effects).toEqual({ people: -1, market: 3, congress: -2, institutions: 3 });
    });

    // The one who arrives is not charged for the fall of the one who left.
    it("charges the loyalty cost to the ministers who were already there", () => {
      const { cabinet } = act(replace);

      expect(findSeat(cabinet, "casa_civil").loyalty).toBe(66);
      expect(findSeat(cabinet, "fazenda").loyalty).toBe(64);
    });

    it("refuses to replace an empty chair", () => {
      const attempt = () =>
        act({ action: "replace", ministryKey: "justica", candidateId: "jz-bruno" });

      expect(attempt).toThrow(expect.objectContaining({ code: "MINISTRY_ALREADY_VACANT" }));
    });
  });

  describe("the limits the Presidency works under", () => {
    it("refuses a second manual change in the same month", () => {
      const attempt = () =>
        act({ action: "dismiss", ministryKey: "fazenda" }, { actionsUsedThisTurn: 1 });

      expect(attempt).toThrow(expect.objectContaining({ code: "CABINET_ACTION_ALREADY_USED" }));
    });

    it("refuses to reorganise the government while the Presidency is suspended", () => {
      const attempt = () => act({ action: "dismiss", ministryKey: "fazenda" }, { suspended: true });

      expect(attempt).toThrow(expect.objectContaining({ code: "CABINET_LOCKED_WHILE_SUSPENDED" }));
    });

    it("lets a pack that allows it act during a suspension", () => {
      const country = actionCountry({ allowActionsWhileSuspended: true });
      const { cabinet } = applyCabinetAction(
        createCabinet(country),
        { action: "dismiss", ministryKey: "fazenda" },
        { ...context(), country, suspended: true },
      );

      expect(findSeat(cabinet, "fazenda").holder).toBeNull();
    });

    it("refuses an operation the engine does not have", () => {
      const attempt = () => act({ action: "promote", ministryKey: "fazenda" });

      expect(attempt).toThrow(expect.objectContaining({ code: "UNKNOWN_CABINET_ACTION" }));
    });

    it("refuses to put one person in two ministries at once", () => {
      const country = actionCountry({
        candidates: [
          { id: "cc-helena", character: "helena-vasque", loyalty: 72 },
          { id: "cc-helena-again", character: "helena-vasque", loyalty: 72 },
        ],
        holders: [{ portfolio: "casa_civil", candidate: "cc-helena" }],
      });
      const attempt = () =>
        applyCabinetAction(
          createCabinet(country),
          { action: "appoint", ministryKey: "justica", candidateId: "cc-helena-again" },
          { ...context(), country },
        );

      expect(attempt).toThrow(expect.objectContaining({ code: "CHARACTER_ALREADY_IN_OFFICE" }));
    });

    it("does not mutate the cabinet it was given", () => {
      const before = createCabinet(actionCountry());

      applyCabinetAction(before, { action: "dismiss", ministryKey: "fazenda" }, context());

      expect(findSeat(before, "fazenda").holder).toBe("caio-ferraz");
    });
  });
});
