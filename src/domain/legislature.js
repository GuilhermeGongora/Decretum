// How a house of parliament splits when it is asked to remove a president.
//
// The old model multiplied the seats by one accumulated support number. It was linear, so pressure
// that kept arriving kept converting into seats, and a determined government reached 492 of 513 —
// a near-unanimous chamber, which is not how a parliament behaves under any real crisis.
//
// Here the house is a set of blocs declared by the country, each with its own seats and its own
// reasons to move. A bloc's adherence is a logistic curve over the drivers of the moment, which is
// the shape political defection actually has: almost nothing happens while the drivers are low, the
// middle moves fast around its tipping point, and the last holdouts cost far more than the first.
// Diminishing returns fall out of the curve rather than being bolted on as a cap.
//
// Saturation is bounded by composition, not by clamping: a bloc whose intercept is deeply negative
// needs drivers far beyond the plausible to cross a half, so a loyal base keeps a share of the house
// out of reach. Unanimity stays possible in principle and unreachable in practice.
//
// Pure and country-agnostic: no seat count, no threshold and no bloc name is written here.

// Weights name the drivers a bloc responds to. Anything a country does not declare weighs nothing.
export const DRIVERS = Object.freeze([
  // What the accusation is worth in public.
  "evidence",
  // The streets, the press, the demonstrations.
  "publicPressure",
  // How hostile the legislature already is to this government.
  "hostility",
  // What the government's own coalition has stopped guaranteeing.
  "cohesionLoss",
  // How little credit the institutions still give the presidency.
  "credibilityLoss",
]);

const logistic = (x) => 1 / (1 + Math.exp(-x));

/**
 * Seats per bloc, summing to exactly the size of the house.
 *
 * Shares are fractions, so they almost never divide a house evenly. The remainders are handed out
 * largest first, which is the standard apportionment and keeps the total exact instead of letting
 * rounding invent or lose a seat.
 */
export function apportion(seats, blocs) {
  const exact = blocs.map((bloc) => ({ key: bloc.key, value: seats * bloc.share }));
  const floors = exact.map((entry) => Math.floor(entry.value));
  const assigned = floors.reduce((total, value) => total + value, 0);

  const order = exact
    .map((entry, index) => ({ index, remainder: entry.value - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  const result = [...floors];
  for (let i = 0; i < seats - assigned; i += 1) {
    result[order[i % order.length].index] += 1;
  }

  return blocs.map((bloc, index) => ({ key: bloc.key, seats: result[index] }));
}

/**
 * How much of a bloc votes to remove the president, from 0 to 1.
 *
 * The intercept is the bloc's resting position — where it stands when nothing is happening — and the
 * weights say what it is willing to move for. A bloc that only answers to evidence ignores the
 * streets; a loyal base answers mostly to its own coalition falling apart.
 */
export function adherence(bloc, drivers) {
  let score = bloc.intercept;
  for (const driver of DRIVERS) {
    const weight = bloc.weights?.[driver];
    if (weight) score += weight * (drivers[driver] ?? 0);
  }
  return logistic(score);
}

/**
 * The count a house produces for these drivers.
 *
 * Deterministic: the same house and the same drivers always give the same seats, with no randomness
 * anywhere. The bloc breakdown is returned for tests and for the engine's own record — it is never
 * handed to a client, which would be telling the player where the votes are hiding.
 */
export function countVotes(house, drivers) {
  const seatsByBloc = apportion(house.seats, house.blocs);

  const byBloc = house.blocs.map((bloc, index) => {
    const seats = seatsByBloc[index].seats;
    const share = adherence(bloc, drivers);
    return { key: bloc.key, seats, adherence: share, votes: seats * share };
  });

  const votes = Math.round(byBloc.reduce((total, bloc) => total + bloc.votes, 0));

  return { votes: Math.min(house.seats, Math.max(0, votes)), byBloc };
}

/**
 * The band the public is given before a count.
 *
 * It is built around the result the engine already holds, so it always contains it: a projection
 * that could exclude the outcome would be a lie told by the server rather than an estimate. It is
 * deliberately wide enough to leave the vote in doubt and never narrows to the number itself.
 */
export function projectVotes(votes, seats) {
  const spread = Math.max(4, Math.round(seats * 0.035));
  return { min: Math.max(0, votes - spread), max: Math.min(seats, votes + spread) };
}
