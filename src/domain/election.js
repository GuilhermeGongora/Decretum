import { DomainRuleError } from "../errors/index.js";
import { CHOICE_SIDES, INITIAL_METER_VALUE, METERS, SUCCESSOR_METER_BOUNDS } from "./constants.js";
import { clampMeter } from "./meters.js";

// The electoral prologue. A pure function of (country, candidate, choices): no randomness at all, so a
// campaign always produces the same election. The country profile arrives as an argument — the engine
// never imports country content.
//
// A campaign can be lost. Winning the first round outright needs more than the country's runoff
// threshold; below it the race is decided in a second round, and what the candidate consolidates
// there is declared by the country, not by the engine. A campaign that refuses every deal is
// honourable and it loses votes: nobody is owed an election for having clean hands.
const ROUNDED = (value) => Math.round(value * 10) / 10;

function sumOf(sources, field) {
  return sources.reduce((total, source) => total + (source[field] ?? 0), 0);
}

function mergeMeters(sources) {
  const meters = Object.fromEntries(METERS.map((meter) => [meter, 0]));
  for (const source of sources) {
    for (const [meter, delta] of Object.entries(source.meters ?? {})) {
      if (meters[meter] !== undefined) meters[meter] += delta;
    }
  }
  return meters;
}

function mergeRegions(sources) {
  const regions = {};
  for (const source of sources) {
    for (const [region, weight] of Object.entries(source.regions ?? {})) {
      regions[region] = (regions[region] ?? 0) + weight;
    }
  }
  return regions;
}

function pickOption(question, side) {
  if (!CHOICE_SIDES.includes(side)) {
    throw new DomainRuleError(`Invalid campaign choice: ${String(side)}`, {
      code: "INVALID_CAMPAIGN_CHOICE",
    });
  }
  return { ...question.options[side], questionId: question.id, side };
}

// Candidate traits are chosen from the country's own option lists; anything else is rejected.
function pickTrait(list, key, field) {
  const trait = list.find((option) => option.key === key);
  if (!trait) {
    throw new DomainRuleError(`Unknown ${field}: ${String(key)}`, { code: "INVALID_CANDIDATE" });
  }
  return trait;
}

export function resolveCandidateTraits(country, candidate) {
  const { candidateOptions } = country;
  return [
    pickTrait(candidateOptions.treatments, candidate.treatment, "treatment"),
    pickTrait(candidateOptions.origins, candidate.origin, "origin"),
    pickTrait(candidateOptions.styles, candidate.style, "style"),
    pickTrait(candidateOptions.parties, candidate.party, "party"),
    pickTrait(candidateOptions.coalitions, candidate.coalition, "coalition"),
    pickTrait(candidateOptions.promises, candidate.promise, "promise"),
  ];
}

export function resolveCampaign({ country, candidate, choices }) {
  const { campaign, electoralRules } = country;
  const questions = campaign.questions;

  if (!Array.isArray(choices) || choices.length !== questions.length) {
    throw new DomainRuleError(`The campaign has ${questions.length} decisions`, {
      code: "INCOMPLETE_CAMPAIGN",
    });
  }

  const traits = resolveCandidateTraits(country, candidate);
  const picked = questions.map((question, index) => pickOption(question, choices[index]));
  const sources = [...traits, ...picked];

  const share = ROUNDED(campaign.baseShare + sumOf(picked, "share"));
  const turnout = ROUNDED(
    Math.min(94, Math.max(62, campaign.baseTurnout + sumOf(picked, "turnout"))),
  );
  // Below the runoff threshold the race is decided in a second round. How much of the eliminated
  // vote each side consolidates is the country's own arithmetic: a first round far below the
  // threshold does not come back from it.
  const decidedInFirstRound = share > electoralRules.runoffThreshold;
  const runoff = campaign.runoff;
  const finalShare = decidedInFirstRound
    ? share
    : ROUNDED(runoff.base + (share - campaign.baseShare) * runoff.slope);
  const opponentShare = ROUNDED(100 - finalShare);
  const margin = ROUNDED(finalShare - opponentShare);
  const elected = margin > 0;

  const attending = Math.round((campaign.electorate * turnout) / 100);
  const validVotes = Math.round(attending * campaign.validVoteRate);
  const votes = Math.round((validVotes * finalShare) / 100);

  const regionWeights = mergeRegions(sources);
  const strongholds = Object.entries(regionWeights)
    .filter(([region]) => country.regions.includes(region))
    .sort(([regionA, weightA], [regionB, weightB]) =>
      weightB === weightA ? regionA.localeCompare(regionB) : weightB - weightA,
    )
    .slice(0, 2)
    .map(([region]) => region);

  const meterModifiers = mergeMeters(sources);
  const meters = Object.fromEntries(
    METERS.map((meter) => [
      meter,
      clampMeter(
        INITIAL_METER_VALUE + meterModifiers[meter],
        SUCCESSOR_METER_BOUNDS.min,
        SUCCESSOR_METER_BOUNDS.max,
      ),
    ]),
  );

  const headline = campaign.headlines.find((entry) => margin >= entry.minMargin);
  // Keys only: the service turns them into flag records with the labels from the catalog.
  const flagKeys = [...new Set(sources.flatMap((source) => source.flags ?? []))].sort();

  return {
    outcome: elected ? "elected" : "defeated",
    // A defeated candidacy starts no government, so there is no state to hand over: null is the
    // truthful answer, not a set of pillars nobody will ever govern with.
    meters: elected ? meters : null,
    flagKeys: elected ? flagKeys : [],
    election: {
      round: decidedInFirstRound ? 1 : 2,
      share: finalShare,
      opponentShare,
      margin,
      votes,
      opponentVotes: validVotes - votes,
      validVotes,
      turnout,
      strongholds,
      // Congress support the coalition delivers, on the same 0-100 scale as the pillars.
      coalitionStrength: meters.congress,
      headline: headline.text,
      summary: headline.summary,
      opponent: {
        name: campaign.opponent.name,
        party: campaign.opponent.party,
        acronym: campaign.opponent.acronym,
      },
      decisions: picked.map(({ questionId, side, id, label }) => ({
        questionId,
        choice: side,
        optionId: id,
        label,
      })),
    },
  };
}
