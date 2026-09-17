import { DomainRuleError } from "../errors/index.js";
import { CABINET_LOYALTY_MAX, CABINET_LOYALTY_MIN } from "./constants.js";

// The cabinet a government holds across the months. Pure: it receives the country pack as an
// argument and never imports content, so the ministries and whoever starts in them belong to the
// country, not to the engine. A seat is a portfolio that is either held or vacant; the engine knows
// nothing else about it.

const clampLoyalty = (value) =>
  Math.min(CABINET_LOYALTY_MAX, Math.max(CABINET_LOYALTY_MIN, Math.round(value)));

/**
 * The ministries the country declares, each seated with whoever it names. A portfolio nobody was
 * named for starts vacant, which is a real state and not a gap to be filled: a government can
 * perfectly well take office without a Justice minister.
 */
export function createCabinet(country) {
  const ministries = country?.keyMinistries ?? [];
  const holders = country?.cabinet?.holders ?? [];
  const defaultLoyalty = country?.cabinet?.defaultLoyalty ?? null;

  return {
    seats: ministries.map((ministry) => {
      const named = holders.find((holder) => holder.portfolio === ministry.key) ?? null;
      return {
        portfolio: ministry.key,
        name: ministry.name,
        holder: named?.character ?? null,
        loyalty: named ? clampLoyalty(named.loyalty ?? defaultLoyalty) : null,
        sinceTurn: 1,
      };
    }),
  };
}

/**
 * The cabinet as a government left it, rebuilt against its country. The pack is the authority on
 * which ministries exist and what they are called; the stored seats are the authority on who sits in
 * them. A declared ministry with no stored seat is therefore vacant, never re-seated with the holder
 * it started with — that is what makes a minister who was handed over stay gone.
 *
 * A government that stored nothing at all is the other case entirely: it predates the cabinet, so it
 * takes office with the one the country describes rather than with a row of empty chairs.
 */
export function restoreCabinet(country, storedSeats = []) {
  if (storedSeats.length === 0) return createCabinet(country);

  const stored = new Map(storedSeats.map((seat) => [seat.portfolio, seat]));

  return {
    seats: (country?.keyMinistries ?? []).map((ministry) => {
      const seat = stored.get(ministry.key) ?? null;
      return {
        portfolio: ministry.key,
        name: ministry.name,
        holder: seat?.holder ?? null,
        loyalty: seat?.holder ? clampLoyalty(seat.loyalty) : null,
        sinceTurn: seat?.sinceTurn ?? 1,
      };
    }),
  };
}

export function findSeat(cabinet, portfolio) {
  return cabinet?.seats?.find((seat) => seat.portfolio === portfolio) ?? null;
}

// How a choice may pick who falls. Content names one of these; it never names the person, because
// which seat is the expendable one is a fact about the state, not about the card. The same cabinet
// always loses the same minister.
const STRATEGIES = {
  // Whoever the government can least afford to defend: the minister already least loyal to it. A tie
  // goes to the ministry the country declares first, so the choice is never arbitrary.
  most_exposed: (seats) =>
    seats.reduce(
      (worst, seat) =>
        seat.holder !== null && (worst === null || seat.loyalty < worst.loyalty) ? seat : worst,
      null,
    ),
};

/**
 * The cabinet after a decision. Dismissal runs before the loyalty shift, so the minister who was
 * handed over does not pay the price of his own fall — the ones who stayed and watched it do.
 */
export function applyCabinetOperations(cabinet, option, turn) {
  const operations = option?.cabinet;
  if (!operations) return { cabinet, changes: [] };

  const changes = [];
  let seats = cabinet.seats;

  if (operations.dismiss) {
    const strategy = STRATEGIES[operations.dismiss];
    if (!strategy) {
      throw new DomainRuleError(`Unknown cabinet dismissal strategy: ${operations.dismiss}`, {
        code: "UNKNOWN_CABINET_STRATEGY",
      });
    }

    const target = strategy(seats);
    // A cabinet with nobody left in it has nobody to hand over. That is not an error: it is a
    // government that has already spent everyone.
    if (target) {
      changes.push({
        type: "dismissed",
        portfolio: target.portfolio,
        name: target.name,
        holder: target.holder,
        loyalty: target.loyalty,
        turn,
      });
      seats = seats.map((seat) =>
        seat.portfolio === target.portfolio
          ? { ...seat, holder: null, loyalty: null, sinceTurn: turn }
          : seat,
      );
    }
  }

  if (Number.isFinite(operations.loyalty) && operations.loyalty !== 0) {
    seats = seats.map((seat) =>
      seat.holder === null
        ? seat
        : { ...seat, loyalty: clampLoyalty(seat.loyalty + operations.loyalty) },
    );
  }

  return { cabinet: { ...cabinet, seats }, changes };
}
