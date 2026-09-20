import { ConflictError, DomainRuleError } from "../errors/index.js";
import { CABINET_ACTIONS, CABINET_LOYALTY_MAX, CABINET_LOYALTY_MIN, METERS } from "./constants.js";

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
export function findCandidate(country, candidateId) {
  const candidates = country?.cabinet?.candidates ?? [];
  return candidates.find((candidate) => candidate.id === candidateId) ?? null;
}

export function createCabinet(country) {
  const ministries = country?.keyMinistries ?? [];
  const holders = country?.cabinet?.holders ?? [];
  const defaultLoyalty = country?.cabinet?.defaultLoyalty ?? null;

  return {
    seats: ministries.map((ministry) => {
      const named = holders.find((holder) => holder.portfolio === ministry.key) ?? null;
      // A holder names a candidate, and the candidate carries the person and the numbers. An unknown
      // reference leaves the chair empty rather than inventing a minister; content validation is
      // what refuses it in the first place.
      const candidate = named ? findCandidate(country, named.candidate) : null;
      return {
        portfolio: ministry.key,
        name: ministry.name,
        holder: candidate?.character ?? null,
        loyalty: candidate ? clampLoyalty(candidate.loyalty ?? defaultLoyalty) : null,
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

// What a president is allowed to know about the people around them. Competence and influence are
// read plainly. Loyalty never is: nobody in office is handed a number for how loyal a minister is,
// so its vocabulary is deliberately vaguer, and the raw score stays on the server.
const COMPETENCE_BANDS = [
  { max: 39, key: "low" },
  { max: 69, key: "moderate" },
  { max: CABINET_LOYALTY_MAX, key: "high" },
];
const LOYALTY_BANDS = [
  { max: 39, key: "wavering" },
  { max: 69, key: "uncertain" },
  { max: CABINET_LOYALTY_MAX, key: "loyal" },
];

const bandOf = (bands, value) =>
  Number.isFinite(value)
    ? (bands.find((entry) => value <= entry.max)?.key ?? bands.at(-1).key)
    : null;

/**
 * The public reading of somebody's numbers, as keys the country turns into words. An empty chair, or
 * an attribute the pack never declared, reads as null rather than as a guess.
 */
export function toPublicAttributes({ competence, loyalty, influence } = {}) {
  return {
    competence: bandOf(COMPETENCE_BANDS, competence),
    loyalty: bandOf(LOYALTY_BANDS, loyalty),
    influence: bandOf(COMPETENCE_BANDS, influence),
  };
}

const noEffects = () => Object.fromEntries(METERS.map((meter) => [meter, 0]));

function addEffects(total, delta) {
  for (const meter of METERS) total[meter] += delta?.[meter] ?? 0;
  return total;
}

// Who the registry lets sit in a given chair. Content arrives as an argument — the way the engine
// already receives the cards and the country — so the domain reads the cast without importing it.
function assertEligible(candidate, ministryKey, characters) {
  const record = characters?.[candidate.character] ?? null;
  const allowed = record?.cabinet?.eligible ? (record.cabinet.ministries ?? []) : [];
  if (!allowed.includes(ministryKey)) {
    throw new DomainRuleError(`${candidate.character} may not hold the ${ministryKey} portfolio`, {
      code: "CANDIDATE_NOT_ELIGIBLE",
    });
  }
}

/**
 * What an operation would cost, before anybody commits to it.
 *
 * One function, used both to preview a change and to apply it, so the screen can never promise a
 * consequence different from the one that lands. It answers for a hypothetical too: a candidate who
 * has not been appointed, a dismissal nobody has signed.
 */
export function cabinetActionEffects(country, { action, candidate = null }) {
  const rules = country?.cabinet ?? {};
  const leaving = action === "dismiss" || action === "replace";
  const arriving = action === "appoint" || action === "replace";

  const effects = noEffects();
  if (leaving) addEffects(effects, rules.effects?.dismiss);
  if (arriving) {
    addEffects(effects, rules.effects?.appoint);
    for (const trait of candidate?.traits ?? []) {
      addEffects(effects, rules.traitEffects?.[trait]);
    }
  }
  return effects;
}

/**
 * The same consequence as a reading rather than a number: which way each pillar would move, and
 * nothing about how far. What a president is told before signing is a direction, not a forecast.
 */
export function toActionTrends(effects) {
  return METERS.filter((meter) => (effects?.[meter] ?? 0) !== 0).map((meter) => ({
    pillar: meter,
    direction: effects[meter] > 0 ? "up" : "down",
  }));
}

/**
 * The Presidency reorganising its own government: one appointment, dismissal or replacement.
 *
 * Every refusal is a rule of the state, not of the screen, and the client never computes any of it.
 * The consequences come from the country (what an appointment or a dismissal costs) and from the
 * candidate (what their traits are worth), so the engine adds numbers up without ever knowing what a
 * "fiscalista" is.
 */
export function applyCabinetAction(
  cabinet,
  request,
  { country, characters, turn, actionsUsedThisTurn = 0, suspended = false },
) {
  const { action, ministryKey, candidateId } = request ?? {};
  const rules = country?.cabinet ?? {};

  if (!CABINET_ACTIONS.includes(action)) {
    throw new DomainRuleError(`Unknown cabinet action: ${String(action)}`, {
      code: "UNKNOWN_CABINET_ACTION",
    });
  }
  // A suspended president does not reorganise the government, unless the pack says otherwise.
  if (suspended && !rules.allowActionsWhileSuspended) {
    throw new ConflictError("The Presidency is suspended and cannot change the cabinet", {
      code: "CABINET_LOCKED_WHILE_SUSPENDED",
    });
  }
  if (actionsUsedThisTurn >= (rules.maxActionsPerTurn ?? 1)) {
    throw new ConflictError("This month's cabinet action has already been used", {
      code: "CABINET_ACTION_ALREADY_USED",
    });
  }

  const seat = findSeat(cabinet, ministryKey);
  if (!seat) {
    throw new DomainRuleError(`Unknown ministry: ${String(ministryKey)}`, {
      code: "UNKNOWN_MINISTRY",
    });
  }

  const leaving = action === "dismiss" || action === "replace";
  const arriving = action === "appoint" || action === "replace";

  if (leaving && seat.holder === null) {
    throw new ConflictError(`The ${ministryKey} portfolio is already vacant`, {
      code: "MINISTRY_ALREADY_VACANT",
    });
  }
  if (action === "appoint" && seat.holder !== null) {
    throw new ConflictError(`The ${ministryKey} portfolio already has a holder`, {
      code: "MINISTRY_ALREADY_HELD",
    });
  }

  let candidate = null;
  if (arriving) {
    candidate = findCandidate(country, candidateId);
    if (!candidate) {
      throw new DomainRuleError(`Unknown candidate: ${String(candidateId)}`, {
        code: "UNKNOWN_CANDIDATE",
      });
    }
    // Already a minister somewhere else is the more specific truth, so it is said first: nobody
    // holds two portfolios at once.
    const elsewhere = cabinet.seats.some(
      (other) => other.portfolio !== ministryKey && other.holder === candidate.character,
    );
    if (elsewhere) {
      throw new ConflictError(`${candidate.character} already holds another portfolio`, {
        code: "CHARACTER_ALREADY_IN_OFFICE",
      });
    }
    assertEligible(candidate, ministryKey, characters);
  }

  // The same arithmetic the screen previewed, from the same function: a promise the server keeps.
  const effects = cabinetActionEffects(country, { action, candidate });

  // Losing a minister costs the ones who stayed, and it is charged before anybody new sits down: the
  // newcomer is not made to pay for a fall they had no part in.
  const cost = leaving ? (rules.dismissalLoyaltyCost ?? 0) : 0;
  const seats = cabinet.seats.map((other) => {
    if (other.portfolio === ministryKey) return other;
    if (other.holder === null || cost === 0) return other;
    return { ...other, loyalty: clampLoyalty(other.loyalty - cost) };
  });

  const previousCharacterId = seat.holder;
  const settled = arriving
    ? {
        ...seat,
        holder: candidate.character,
        loyalty: clampLoyalty(candidate.loyalty ?? rules.defaultLoyalty),
        sinceTurn: turn,
      }
    : { ...seat, holder: null, loyalty: null, sinceTurn: turn };

  return {
    cabinet: {
      ...cabinet,
      seats: seats.map((other) => (other.portfolio === ministryKey ? settled : other)),
    },
    action: {
      turn,
      action,
      ministryKey,
      previousCharacterId,
      nextCharacterId: settled.holder,
    },
    effects,
  };
}

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
