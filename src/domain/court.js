// The constitutional court as a body that decides, not as a name that presides.
//
// Until now the court existed only as voice and consequence: it opened a trial, a justice spoke in a
// card, and an impeachment ground already assumed rulings the game never issued. Here it judges the
// government's own record and rules on it.
//
// The bench is the same bloc model the houses use, because a court splits the way any deliberative
// body splits: a resting position per bloc and a logistic curve over what each bloc is willing to
// move for. Nothing is added to `legislature.js` for this — an eleven-seat bench is simply another
// house, and reusing it untouched keeps the balanced removal counts exactly as they were.
//
// It deliberately weighs only two of the declared drivers plus the streets. Hostility in parliament
// and a coalition falling apart move deputies, not justices; a bench that declares no weight for them
// is not missing anything, since what a country does not declare weighs nothing.
//
// Never subordinate to the player: the Presidency neither seats these justices nor removes them, and
// there is no action anywhere that improves the government's standing before them. The only way to
// face a friendlier court is to leave a lighter record.
//
// Pure and country-agnostic: no seat count, no majority and no matter is written here.
import { isFlagActive } from "./flags.js";
import { countVotes } from "./legislature.js";

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));

/**
 * What the court has before it.
 *
 * The country lists the matters it can rule on and which flags document each one, exactly as it
 * lists the grounds for removal. A matter reaches the bench only because the government's own record
 * put it there, so nothing arrives by chance. A country with no court has nothing before it, which
 * is what lets a pack ship without one.
 */
export function assessMatters({ country, flags }) {
  const catalog = country?.court?.matters ?? [];
  // A matter is decided once. The flag that evidences it stays on the record forever, so without its
  // own marker the bench would rule on the same case every month for the rest of the mandate. Each
  // matter carries the marker its ruling leaves, which is why one decision never silences the others.
  const matched = catalog.filter(
    (matter) =>
      !isFlagActive(flags, matter.ruledFlag) &&
      (matter.flags ?? []).some((key) => isFlagActive(flags, key)),
  );

  return {
    matters: matched.map((matter) => matter.key),
    // Several open cases read as a heavier record than one, and the heaviest is the one decided.
    evidence: clamp(matched.reduce((total, matter) => total + matter.weight, 0)),
    primary: matched.reduce(
      (worst, matter) => (worst === null || matter.weight > worst.weight ? matter : worst),
      null,
    ),
  };
}

/**
 * What moves this bench, from 0 to 1.
 *
 * The record first, and only then how little credit the presidency still has and how loud the
 * streets are. A court that answered to the streets before the file would not be a court.
 */
function driversFor(assessment, meters) {
  return {
    evidence: assessment.evidence / 100,
    credibilityLoss: 1 - meters.institutions / 100,
    publicPressure: 1 - meters.people / 100,
  };
}

/**
 * The decision the bench reaches on the heaviest matter before it.
 *
 * Deterministic: the same record and the same country always give the same count. The bloc breakdown
 * is returned for tests and for the engine's record, never for a client — showing where a justice
 * stands would turn a court into a whip count.
 */
export function courtRuling({ country, flags, meters }) {
  const assessment = assessMatters({ country, flags });
  if (!assessment.primary) return null;

  const { votes, byBloc } = countVotes(country.court, driversFor(assessment, meters));

  return {
    matter: assessment.primary,
    votes,
    byBloc,
    upheld: votes >= country.court.majority,
  };
}
