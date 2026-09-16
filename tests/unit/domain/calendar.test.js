import { getCalendar } from "@/src/domain/calendar";

describe("getCalendar", () => {
  it.each([
    [1, { year: 1, monthIndex: 0 }],
    [12, { year: 1, monthIndex: 11 }],
    [13, { year: 2, monthIndex: 0 }],
    [48, { year: 4, monthIndex: 11 }],
  ])("maps turn %i to %o", (turn, expected) => {
    expect(getCalendar(turn)).toEqual(expected);
  });

  it("rejects turns below 1", () => {
    expect(() => getCalendar(0)).toThrow(RangeError);
  });
});
