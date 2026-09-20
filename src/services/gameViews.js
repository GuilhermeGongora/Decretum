// Maps engine and persistence shapes to API responses. No game rules are decided here.
import { getCharacter } from "@/src/content/characters";
import { getCalendar } from "@/src/domain/calendar";
import { METERS, PROCEDURE_STATUS } from "@/src/domain/constants";
import { resolveChoiceDeltas } from "@/src/domain/effects";
import { cabinetActionEffects, toActionTrends, toPublicAttributes } from "@/src/domain/cabinet";
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

// A minister as the public knows them: who they are, what they are called, and how the country reads
// their numbers. The numbers themselves never appear — loyalty least of all.
function toPersonView(characterId) {
  const character = getCharacter(characterId);
  if (!character) return null;
  return {
    characterId,
    name: character.name,
    publicTitle: character.role,
    portrait: character.portrait ?? null,
    initials: character.initials ?? null,
  };
}

function toAttributesView(country, numbers, traitKeys = []) {
  const labels = country?.cabinet?.attributeLabels ?? {};
  const traits = country?.cabinet?.traits ?? [];
  const reading = toPublicAttributes(numbers);

  return {
    competence: labels.competence?.[reading.competence] ?? null,
    loyalty: labels.loyalty?.[reading.loyalty] ?? null,
    influence: labels.influence?.[reading.influence] ?? null,
    traits: traitKeys
      .map((key) => traits.find((trait) => trait.key === key)?.label ?? null)
      .filter((label) => label !== null),
  };
}

/**
 * The cabinet as the Presidency may see it.
 *
 * `availableActions` is empty whenever the server would refuse anyway — the month's action already
 * spent, a suspended presidency, a government that has ended — so the screen never offers a decision
 * that cannot be taken. The candidate list leaves out anyone already holding a portfolio, for the
 * same reason.
 */
export function toCabinetView(cabinet, country, { turn, actionsUsed = 0, suspended, active }) {
  if (!cabinet || !country?.cabinet) return null;

  const rules = country.cabinet;
  const ministries = country.keyMinistries ?? [];
  const candidates = rules.candidates ?? [];
  const candidateFor = (characterId) =>
    candidates.find((candidate) => candidate.character === characterId) ?? null;

  const mayAct = Boolean(active) && !(suspended && !rules.allowActionsWhileSuspended);
  const actionAvailable = mayAct && actionsUsed < (rules.maxActionsPerTurn ?? 1);
  const inOffice = new Set(cabinet.seats.map((seat) => seat.holder).filter(Boolean));

  return {
    actionAvailable,
    actionUsedAtTurn: actionsUsed > 0 ? turn : null,
    seats: cabinet.seats.map((seat) => {
      const ministry = ministries.find((entry) => entry.key === seat.portfolio) ?? null;
      const candidate = seat.holder ? candidateFor(seat.holder) : null;
      const occupied = seat.holder !== null;

      return {
        ministryKey: seat.portfolio,
        ministryName: ministry?.title ?? ministry?.name ?? seat.portfolio,
        note: ministry?.note ?? null,
        status: occupied ? "occupied" : "vacant",
        occupant: occupied ? toPersonView(seat.holder) : null,
        publicAttributes: occupied
          ? toAttributesView(
              country,
              // Loyalty is the living number on the seat; the rest describe the person.
              {
                competence: candidate?.competence,
                loyalty: seat.loyalty,
                influence: candidate?.influence,
              },
              candidate?.traits ?? [],
            )
          : null,
        appointedAtTurn: occupied ? seat.sinceTurn : null,
        availableActions: actionAvailable ? (occupied ? ["dismiss", "replace"] : ["appoint"]) : [],
        // What losing this minister would do, in directions rather than numbers. Null when there is
        // nobody to lose.
        dismissTrends: occupied
          ? toActionTrends(cabinetActionEffects(country, { action: "dismiss" }))
          : null,
      };
    }),
    // Everyone the Presidency could still reach for. Whoever already holds a portfolio is left out:
    // offering a name the server would refuse is worse than not offering it.
    candidates: candidates
      .filter((candidate) => !inOffice.has(candidate.character))
      .map((candidate) => {
        const character = getCharacter(candidate.character);
        const allowed = character?.cabinet?.eligible ? (character.cabinet.ministries ?? []) : [];
        return {
          id: candidate.id,
          ...toPersonView(candidate.character),
          eligibleMinistries: allowed,
          biography: candidate.biography ?? null,
          // What signing this name would do. Two readings, because arriving into an empty chair and
          // arriving over somebody else do not cost the same: the screen picks by the seat's state.
          appointTrends: toActionTrends(
            cabinetActionEffects(country, { action: "appoint", candidate }),
          ),
          replaceTrends: toActionTrends(
            cabinetActionEffects(country, { action: "replace", candidate }),
          ),
          publicAttributes: toAttributesView(
            country,
            {
              competence: candidate.competence,
              loyalty: candidate.loyalty,
              influence: candidate.influence,
            },
            candidate.traits ?? [],
          ),
        };
      })
      .filter((candidate) => candidate.eligibleMinistries.length > 0),
  };
}

const CABINET_ACTION_LABELS = {
  appoint: "Nomeação",
  dismiss: "Exoneração",
  replace: "Substituição",
};

const ministryNameIn = (country, ministryKey) => {
  const ministry = (country?.keyMinistries ?? []).find((entry) => entry.key === ministryKey);
  return ministry?.title ?? ministry?.name ?? ministryKey;
};

/**
 * Every change to the cabinet, as entries for the archive. `source` keeps the two kinds apart: what
 * the Presidency signed, and what a card forced out of it. The archive should not blur them.
 */
export function toCabinetChronicleView(actions, country) {
  if (!country?.cabinet) return [];
  const nameOf = (id) => (id ? (getCharacter(id)?.name ?? id) : null);

  return actions.map((action) => {
    const ministryName = ministryNameIn(country, action.ministryKey);
    const previousHolder = nameOf(action.previousCharacterId);
    const nextHolder = nameOf(action.nextCharacterId);
    // No article before the ministry: "Casa Civil" and "Ministério da Fazenda" do not take the same
    // one, and the pasta itself is always feminine.
    const summary =
      action.action === "appoint"
        ? `${ministryName}: ${nextHolder} assumiu a pasta.`
        : action.action === "dismiss"
          ? `${ministryName}: ${previousHolder} deixou a pasta.`
          : `${ministryName}: ${nextHolder} substituiu ${previousHolder}.`;

    return {
      id: action.id,
      turn: action.turn,
      calendar: getCalendar(action.turn),
      type: action.action,
      label: CABINET_ACTION_LABELS[action.action] ?? action.action,
      ministryKey: action.ministryKey,
      ministryName,
      previousHolder,
      nextHolder,
      source: action.source,
      summary,
    };
  });
}

/**
 * What a decision did to the cabinet this month, in public words. The engine's change carries the
 * loyalty the seat was holding; it is dropped here, because the screen is never told that number.
 */
export function toCabinetChangeViews(changes, country) {
  if (!country?.cabinet) return [];
  return (changes ?? []).map((change) => ({
    type: change.type,
    ministryKey: change.portfolio,
    ministryName: ministryNameIn(country, change.portfolio),
    holder: getCharacter(change.holder)?.name ?? change.holder,
  }));
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
