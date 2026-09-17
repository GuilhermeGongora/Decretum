// Maps engine and persistence shapes to API responses. No game rules are decided here.
import { getCharacter } from "@/src/content/characters";
import { getCalendar } from "@/src/domain/calendar";
import { METERS, PROCEDURE_STATUS } from "@/src/domain/constants";
import { resolveChoiceDeltas } from "@/src/domain/effects";
import { getMeterBand, getTrend } from "@/src/domain/meters";
import {
  countChamberVotes,
  countSenateVotes,
  estimateRange,
  nextStage,
} from "@/src/domain/procedure";

export function toMetersView(meters) {
  return Object.fromEntries(
    METERS.map((meter) => [meter, { value: meters[meter], band: getMeterBand(meters[meter]) }]),
  );
}

export function toGameView(game, country) {
  return {
    id: game.id,
    role: game.role,
    status: game.status,
    turn: game.turn,
    calendar: getCalendar(game.turn),
    startYear: game.startYear,
    meters: toMetersView(game.meters),
    // Resolved from the country code at read time; the profile is never copied into the government.
    country: toCountryView(country),
    candidate: game.candidate ?? null,
    election: game.election ?? null,
    mandateCompleted: game.mandateCompleted,
    endingCode: game.endingCode,
    previousGameId: game.previousGameId,
    createdAt: game.createdAt,
    updatedAt: game.updatedAt,
    endedAt: game.endedAt,
  };
}

// Public dossier of a country pack: institutions and vocabulary, never the effects of an option.
export function toCountryView(country) {
  if (!country) return null;

  const view = {
    code: country.countryCode,
    playable: country.playable,
    name: country.name,
    longName: country.longName,
    system: country.system,
    summary: country.summary,
    office: {
      title: country.office.title,
      shortTitle: country.office.shortTitle ?? country.office.title,
      headquarters: country.office.headquarters ?? null,
      termMonths: country.office.termMonths,
    },
    legislature: country.legislature ?? null,
  };

  if (!country.playable) {
    return { ...view, developmentNote: country.developmentNote ?? null };
  }

  return {
    ...view,
    demonym: country.demonym,
    systemNote: country.systemNote,
    oath: country.oath,
    office: { ...view.office, address: country.office.address, termNote: country.office.termNote },
    electoralRules: country.electoralRules,
    powers: country.powers,
    keyMinistries: country.keyMinistries,
    removal: {
      type: country.removal.type,
      note: country.removal.note,
      stages: country.removal.stages,
    },
    terminology: country.terminology,
    theme: country.theme,
    regions: country.regions,
  };
}

// Candidate options and campaign questions without meters, flags or vote weights: the player chooses
// a position, not a known consequence (GDD §9).
export function toCandidateOptionsView(country) {
  const pick = ({ key, label, note }) => ({ key, label, note: note ?? null });
  const { candidateOptions } = country;

  return {
    treatments: candidateOptions.treatments.map(({ key, label }) => ({ key, label })),
    origins: candidateOptions.origins.map(pick),
    styles: candidateOptions.styles.map(pick),
    parties: candidateOptions.parties.map(({ key, name, acronym, lean }) => ({
      key,
      name,
      acronym,
      lean,
    })),
    coalitions: candidateOptions.coalitions.map(pick),
    promises: candidateOptions.promises.map(pick),
  };
}

export function toCampaignView(country) {
  const { campaign } = country;
  const toOption = ({ id, label, note }) => ({ id, label, note });

  return {
    opponent: campaign.opponent,
    questions: campaign.questions.map((question) => ({
      id: question.id,
      kicker: question.kicker,
      text: question.text,
      options: { left: toOption(question.options.left), right: toOption(question.options.right) },
    })),
  };
}

// Name and title come from the snapshot (history keeps what was shown); artwork comes from the character
// registry by stable id. Snapshots without a known id fall back to the name's initials in the UI.
export function toSpeakerView(speaker) {
  const character = getCharacter(speaker.id);
  return {
    id: speaker.id ?? null,
    name: speaker.name,
    title: speaker.title,
    initials: character?.initials ?? null,
    portrait: character?.portrait
      ? { src: character.portrait, position: character.portraitPosition }
      : null,
    accent: character?.accent ?? null,
  };
}

// Deltas are resolved on the server for the current pillars; the client never sends them back.
function toChoiceView(choice, meters) {
  const deltas = resolveChoiceDeltas(choice, meters);
  return {
    label: choice.label,
    effects: Object.fromEntries(
      METERS.map((meter) => [meter, { delta: deltas[meter], ...getTrend(deltas[meter]) }]),
    ),
  };
}

export function toCardView(card, meters) {
  return {
    slug: card.slug,
    type: card.type,
    category: card.category,
    isCrisis: card.type === "crisis",
    speaker: toSpeakerView(card.speaker),
    text: card.text,
    choices: {
      left: toChoiceView(card.choices.left, meters),
      right: toChoiceView(card.choices.right, meters),
    },
  };
}

// Scheduled follow-ups stay hidden: the GDD reveals consequences only through narrative (§9).
export function toDecisionView(decision) {
  return {
    turn: decision.turn,
    calendar: getCalendar(decision.turn),
    cardSlug: decision.cardSlug,
    speaker: toSpeakerView(decision.speaker),
    cardText: decision.cardText,
    choice: decision.choice,
    choiceLabel: decision.choiceLabel,
    resultText: decision.resultText,
    // Persisted snapshot; null for decisions recorded without an authored consequence.
    consequence: decision.consequence
      ? { headline: decision.consequence.headline, reaction: decision.consequence.reaction }
      : null,
    deltas: decision.deltas,
    metersBefore: decision.metersBefore,
    metersAfter: decision.metersAfter,
    flagChanges: decision.flagChanges.map(({ type, key, label }) => ({ type, key, label })),
  };
}

// What the player may know about a running procedure. The support the engine counts with is never
// exposed: before a house votes, the interface gets a band; once it has voted, the confirmed count.
// Evidence, coalition cohesion and the rest stay on the server, where the outcome is decided.
function toHouseView(house, { votes, threshold, estimate }) {
  return {
    name: house.name,
    seats: house.seats,
    threshold,
    votes: votes ?? null,
    estimate: votes === null || votes === undefined ? estimate : null,
  };
}

// Which body holds the process at each link of the chain. The stages come from the country, so this
// only says whether the lower or the upper house is the one deciding next.
const SENATE_STAGES = Object.freeze(["senate_admissibility", "suspended", "senate_trial"]);

// The accusation as the public can read it. The engine's evidence is a number the player must never
// see: what leaves the server is how heavy the file is, in words.
function toAccusationLevel(evidence) {
  if (evidence < 35) return { key: "weak", label: "frágeis" };
  if (evidence < 65) return { key: "relevant", label: "relevantes" };
  return { key: "grave", label: "graves" };
}

// Where the presidency stands, which is not the same as where the process stands: a suspended
// president is not a removed one, and an acquitted one is back in office.
function toPresidencyStatus(procedure) {
  if (procedure.resolution === "removed") return { key: "removed", label: "Mandato encerrado" };
  if (procedure.resolution === "acquitted")
    return { key: "restored", label: "Presidência restituída" };
  if (procedure.stage === "suspended") return { key: "suspended", label: "Presidência afastada" };
  return { key: "in_office", label: "Presidência em exercício" };
}

// `currentTurn` is the month the government is living. Without it a deadline can only be described
// as the distance from the day the process opened, which never moves and is not what anyone facing a
// clock wants to know.
export function toProcedureView(procedure, country, currentTurn = null) {
  if (!procedure || !country?.removal) return null;

  const { removal } = country;
  const stage = removal.stages.find((entry) => entry.key === procedure.stage) ?? null;
  const active = procedure.status === PROCEDURE_STATUS.ACTIVE;
  const senateThreshold =
    procedure.stage === "senate_trial"
      ? removal.senate.convictionVotes
      : removal.senate.admissibilityVotes;

  const inSenate = SENATE_STAGES.includes(procedure.stage);
  const upcoming = active ? nextStage(procedure.stage) : null;
  const milestone = upcoming ? (removal.stages.find((e) => e.key === upcoming) ?? null) : null;
  const resolution = procedure.resolution
    ? (removal.resolutions.find((e) => e.key === procedure.resolution) ?? null)
    : null;
  const grounds = removal.grounds.find((entry) => entry.key === procedure.grounds) ?? null;

  return {
    type: procedure.type,
    status: procedure.status,
    stage: { key: procedure.stage, label: stage?.label ?? null, note: stage?.note ?? null },
    // Which house decides the stage the process stands at, named by the country itself.
    institution: inSenate ? removal.senate.name : removal.chamber.name,
    // What comes next, without promising how it ends.
    nextMilestone: milestone ? { key: upcoming, label: milestone.label } : null,
    presidency: toPresidencyStatus(procedure),
    // The charge in public words, never the number behind it.
    accusation: {
      level: toAccusationLevel(procedure.evidence),
      grounds: grounds ? [{ key: grounds.key, label: grounds.label }] : [],
    },
    resolution: procedure.resolution,
    resolutionLabel: resolution?.label ?? null,
    openedAtTurn: procedure.openedAtTurn,
    calendar: getCalendar(procedure.openedAtTurn),
    // Only while suspended does a deadline exist; it is the one number the player must plan around.
    deadlineTurn: procedure.deadlineTurn,
    // What is left of the suspension from where the government stands now, never the span the
    // deadline was set with: a clock that does not move is not a clock. Null when the month is not
    // known, because an invented number is worse than none.
    turnsLeft:
      active && procedure.deadlineTurn !== null && Number.isInteger(currentTurn)
        ? Math.max(0, procedure.deadlineTurn - currentTurn)
        : null,
    chamber: toHouseView(removal.chamber, {
      votes: procedure.chamberVotes,
      threshold: removal.chamber.authorizationVotes,
      estimate: active
        ? estimateRange(countChamberVotes(procedure, country), removal.chamber.seats)
        : null,
    }),
    senate: toHouseView(removal.senate, {
      votes: procedure.senateVotes,
      threshold: senateThreshold,
      estimate: active
        ? estimateRange(countSenateVotes(procedure, country), removal.senate.seats)
        : null,
    }),
    timeline: procedure.timeline.map(({ turn, stage: at, note }) => ({
      turn,
      calendar: getCalendar(turn),
      stage: at,
      note: note ?? null,
    })),
  };
}

// The milestones of a constitutional procedure, as entries for the archive. They are built from the
// timeline the engine wrote when each step happened — nothing is reconstructed from the current
// state, so an entry never changes after the month that produced it.
export function toProcedureChronicleView(procedure, country) {
  if (!procedure || !country?.removal) return [];

  const { removal } = country;
  const nameOf = (key) =>
    removal.stages.find((stage) => stage.key === key)?.label ??
    removal.resolutions.find((resolution) => resolution.key === key)?.label ??
    key;

  return procedure.timeline.map((entry, index) => ({
    // Stable within a government: the turn plus the position in that procedure's own record.
    id: `${procedure.type}-${procedure.openedAtTurn}-${entry.turn}-${index}`,
    type: procedure.type,
    turn: entry.turn,
    calendar: getCalendar(entry.turn),
    stage: entry.stage,
    label: nameOf(entry.stage),
    institution: SENATE_STAGES.includes(entry.stage) ? removal.senate.name : removal.chamber.name,
    // Whatever the engine recorded at the time: a vote count, a ground, or nothing at all.
    note: entry.note ?? null,
  }));
}

export function toEndingView(code, endings) {
  if (!code) return null;
  const ending = endings[code];
  return { code, kind: ending.kind, title: ending.title, text: ending.text };
}

export function toSummaryView(summary, { endings, epithets }) {
  return {
    ending: toEndingView(summary.endingCode, endings),
    primaryMeter: summary.primaryMeter,
    simultaneousCrises: summary.simultaneousEndingCodes.map((code) => toEndingView(code, endings)),
    mandateCompleted: summary.mandateCompleted,
    duration: summary.duration,
    finalMeters: toMetersView(summary.finalMeters),
    decisionsCount: summary.decisionsCount,
    topDecisions: summary.topDecisions.map((entry) => ({
      turn: entry.turn,
      calendar: getCalendar(entry.turn),
      speaker: toSpeakerView(entry.speaker),
      choiceLabel: entry.choiceLabel,
      deltas: entry.deltas,
      impact: entry.impact,
    })),
    legacyFlags: summary.legacyFlags,
    score: summary.score,
    epithet: { code: summary.epithetCode, title: epithets[summary.epithetCode].title },
  };
}
