import {
  applyCabinetOperations,
  createCabinet,
  findSeat,
  restoreCabinet,
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
    cabinet: {
      defaultLoyalty: 60,
      holders: [
        { portfolio: "casa_civil", character: "helena-vasque", loyalty: 72 },
        { portfolio: "fazenda", character: "caio-ferraz", loyalty: 48 },
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

  it("falls back to the pack's default loyalty when a holder is named without one", () => {
    const country = buildCountry({
      cabinet: {
        defaultLoyalty: 55,
        holders: [{ portfolio: "fazenda", character: "caio-ferraz" }],
      },
    });

    expect(findSeat(createCabinet(country), "fazenda").loyalty).toBe(55);
  });

  it("ignores a holder named for a ministry the country does not declare", () => {
    const country = buildCountry({
      cabinet: {
        defaultLoyalty: 60,
        holders: [{ portfolio: "defesa", character: "otavio-leme" }],
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
        holders: [
          { portfolio: "fazenda", character: "caio-ferraz", loyalty: 40 },
          { portfolio: "casa_civil", character: "helena-vasque", loyalty: 40 },
        ],
      },
    });

    const { changes } = applyCabinetOperations(createCabinet(country), handOver, 12);

    expect(changes[0].portfolio).toBe("casa_civil");
  });

  it("has nobody to hand over when every seat is already vacant", () => {
    const country = buildCountry({ cabinet: { defaultLoyalty: 60, holders: [] } });
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
        holders: [{ portfolio: "casa_civil", character: "helena-vasque", loyalty: 4 }],
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
  // one the country describes, rather than with six empty chairs.
  it("gives the country's starting cabinet to a government that never stored one", () => {
    const country = buildCountry();

    expect(restoreCabinet(country, [])).toEqual(createCabinet(country));
  });
});
