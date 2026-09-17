"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/app/_lib/api";
import {
  clearSavedGameId,
  getPreferences,
  getServerPreferences,
  readSavedGameId,
  readServerGameId,
  saveGameId,
  subscribeStorage,
  updatePreferences,
} from "@/app/_lib/storage";
import { PILLARS, errorMessage, formatDelta } from "@/app/_lib/text";
import { ChronicleDrawer } from "./chronicle/ChronicleDrawer";
import { EndingScreen } from "./ending/EndingScreen";
import { GameScreen } from "./game/GameScreen";
import { GameShell } from "./game/GameShell";
import { Modal } from "./Modal";
import { BriefingScreen } from "./onboarding/BriefingScreen";
import { CampaignScreen } from "./onboarding/CampaignScreen";
import { CandidateScreen } from "./onboarding/CandidateScreen";
import { CountrySelectScreen } from "./onboarding/CountrySelectScreen";
import { CoverScreen } from "./onboarding/CoverScreen";
import { ElectionNightScreen } from "./onboarding/ElectionNightScreen";
import { InaugurationScreen } from "./onboarding/InaugurationScreen";
import { SettingsDialog } from "./SettingsDialog";
import { Tutorial } from "./Tutorial";

function toSnapshot(response) {
  return {
    game: response.game,
    currentCard: response.currentCard ?? response.nextCard ?? null,
    // Where the constitutional process stands, as the server describes it in public terms. Null for
    // a government facing none, which is every government until one is opened against it.
    procedure: response.procedure ?? null,
    ending: response.ending ?? null,
    summary: response.summary ?? null,
  };
}

function announce(response) {
  const values = PILLARS.map(
    ({ key, name }) =>
      `${name} ${response.game.meters[key].value} (${formatDelta(response.effects[key])})`,
  ).join(", ");
  const headline = response.consequence ? `${response.consequence.headline}. ` : "";
  return `${headline}${response.resultText} ${values}.`;
}

// Every option starts on the first entry, so the registration is valid as soon as a name is typed.
function defaultCandidate(country) {
  const options = country.candidateOptions;
  return {
    name: "",
    treatment: options.treatments[0].key,
    origin: options.origins[0].key,
    style: options.styles[0].key,
    party: options.parties[0].key,
    coalition: options.coalitions[0].key,
    promise: options.promises[0].key,
  };
}

export default function DecretumApp() {
  const preferences = useSyncExternalStore(subscribeStorage, getPreferences, getServerPreferences);
  const savedGameId = useSyncExternalStore(subscribeStorage, readSavedGameId, readServerGameId);

  const [snapshot, setSnapshot] = useState(null);
  const [resumeFailedFor, setResumeFailedFor] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [inheritance, setInheritance] = useState(null);
  // null | { step: "country" | "candidate" | "campaign" | "election" | "briefing" }
  //      | { step: "inauguration", mode: "new" | "successor" }
  const [onboarding, setOnboarding] = useState(null);
  const [countries, setCountries] = useState(null);
  // { countryCode, candidate, answers } while the player is being registered and campaigning.
  const [draft, setDraft] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  // Blocks a second government before React has re-rendered the pending state.
  const creatingRef = useRef(false);

  const shouldResume = Boolean(savedGameId) && snapshot === null && resumeFailedFor !== savedGameId;
  const selectedCountry = countries?.find((country) => country.code === draft?.countryCode) ?? null;

  // Reloading returns to the stored government and its undecided card (GDD §25).
  useEffect(() => {
    if (!shouldResume) return undefined;
    let cancelled = false;

    api
      .getGame(savedGameId)
      .then((response) => {
        if (!cancelled) setSnapshot(toSnapshot(response));
      })
      .catch((requestError) => {
        if (cancelled) return;
        if (requestError.status === 404) {
          clearSavedGameId();
          setError("O governo salvo não foi encontrado. Você pode iniciar um novo mandato.");
        } else {
          setError(errorMessage(requestError));
        }
        setResumeFailedFor(savedGameId);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldResume, savedGameId]);

  // The country dossiers are fetched once, when the player asks for a new mandate.
  useEffect(() => {
    if (onboarding?.step !== "country" || countries !== null) return undefined;
    let cancelled = false;

    api
      .getCountries()
      .then((response) => {
        if (!cancelled) setCountries(response.countries);
      })
      .catch((requestError) => {
        if (!cancelled) setError(errorMessage(requestError));
      });

    return () => {
      cancelled = true;
    };
  }, [onboarding, countries]);

  function goTo(nextOnboarding) {
    setError(null);
    setOnboarding(nextOnboarding);
  }

  function chooseCountry(code) {
    const country = countries.find((entry) => entry.code === code);
    setDraft({ countryCode: code, candidate: defaultCandidate(country), answers: [] });
    goTo({ step: "candidate" });
  }

  async function submitCampaign(answers) {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await api.createGame({
        countryCode: draft.countryCode,
        candidate: draft.candidate,
        campaign: { choices: answers },
      });
      saveGameId(response.game.id);
      setSnapshot(toSnapshot(response));
      setFeedback(null);
      setInheritance(null);
      setOnboarding({ step: "election" });
    } catch (requestError) {
      // The campaign is kept, so a failed count is counted again instead of fought again.
      setError(errorMessage(requestError));
    } finally {
      creatingRef.current = false;
      setPending(false);
    }
  }

  async function answerCampaign(side) {
    const answers = [...draft.answers, side];
    setDraft({ ...draft, answers });
    if (answers.length === selectedCountry.campaign.questions.length) await submitCampaign(answers);
  }

  async function decide(choice) {
    if (pending || !snapshot) return false;
    setPending(true);
    setError(null);
    try {
      const response = await api.decide(snapshot.game.id, choice, snapshot.game.turn);
      setFeedback({
        decision: response.decision,
        effects: response.effects,
        resultText: response.resultText,
        consequence: response.consequence ?? null,
        // What the constitutional chain did this month, as the server reported it. The interface
        // opens a vote screen because of this event, never because it recognised a headline.
        procedureEvent: response.procedureEvent ?? null,
      });
      setSnapshot(toSnapshot(response));
      setInheritance(null);
      setAnnouncement(announce(response));
      return true;
    } catch (requestError) {
      if (requestError.code === "TURN_ALREADY_DECIDED" || requestError.code === "GAME_NOT_ACTIVE") {
        const fresh = await api.getGame(snapshot.game.id).catch(() => null);
        if (fresh) setSnapshot(toSnapshot(fresh));
      }
      setError(errorMessage(requestError));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function startSuccessor() {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await api.createSuccessor(snapshot.game.id);
      saveGameId(response.game.id);
      setSnapshot(toSnapshot(response));
      setInheritance(response.inheritance);
      setFeedback(null);
      setOnboarding(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      creatingRef.current = false;
      setPending(false);
    }
  }

  // Returns to the cover and stops following the government in this browser. The decisions and the
  // chronicle stay in the archive: nothing is deleted here.
  function backToCover() {
    clearSavedGameId();
    setSnapshot(null);
    setFeedback(null);
    setInheritance(null);
    setOnboarding(null);
    setDraft(null);
    setError(null);
    setDialog(null);
  }

  function finishTutorial() {
    updatePreferences({ tutorialSeen: true });
    setDialog(null);
  }

  function enterGovernment() {
    setOnboarding(null);
    if (!preferences.tutorialSeen) setDialog("tutorial");
  }

  const step = onboarding?.step;
  const governmentIsOpen = snapshot !== null && snapshot.game.status === "active" && !step;
  let content;

  if (savedGameId === undefined || shouldResume) {
    content = (
      <GameShell scrollable>
        <main className="screen">
          <p className="loading" role="status">
            Abrindo o arquivo do Palácio…
          </p>
        </main>
      </GameShell>
    );
  } else if (step === "country") {
    content = (
      <GameShell scrollable scene="archive">
        <CountrySelectScreen
          countries={countries ?? []}
          loading={countries === null && !error}
          pending={pending}
          error={error}
          onSelect={chooseCountry}
          onBack={() => goTo(null)}
        />
      </GameShell>
    );
  } else if (step === "candidate") {
    content = (
      <GameShell scrollable scene="archive" sceneIntensity="deep">
        <CandidateScreen
          country={selectedCountry}
          options={selectedCountry.candidateOptions}
          candidate={draft.candidate}
          onChange={(patch) => setDraft({ ...draft, candidate: { ...draft.candidate, ...patch } })}
          onBack={() => goTo({ step: "country" })}
          onProceed={() => {
            setDraft({ ...draft, answers: [] });
            goTo({ step: "campaign" });
          }}
        />
      </GameShell>
    );
  } else if (step === "campaign") {
    content = (
      <GameShell scrollable scene="debate">
        <CampaignScreen
          country={selectedCountry}
          campaign={selectedCountry.campaign}
          candidate={draft.candidate}
          index={draft.answers.length}
          answers={draft.answers}
          pending={pending}
          error={error}
          onAnswer={answerCampaign}
          onRetry={() => submitCampaign(draft.answers)}
          onRestart={() => setDraft({ ...draft, answers: [] })}
          onBack={() =>
            draft.answers.length > 0
              ? setDraft({ ...draft, answers: draft.answers.slice(0, -1) })
              : goTo({ step: "candidate" })
          }
        />
      </GameShell>
    );
  } else if (step === "election") {
    content = (
      <GameShell scrollable scene="count">
        <ElectionNightScreen
          country={snapshot.game.country}
          candidate={snapshot.game.candidate}
          election={snapshot.game.election}
          reducedMotion={preferences.reducedMotion}
          onProceed={() => goTo({ step: "inauguration", mode: "new" })}
        />
      </GameShell>
    );
  } else if (step === "inauguration") {
    const isSuccessor = onboarding.mode === "successor";
    content = (
      <GameShell scrollable scene="ceremony">
        <InaugurationScreen
          country={snapshot.game.country}
          candidate={snapshot.game.candidate}
          election={snapshot.game.election}
          mode={onboarding.mode}
          legacyFlags={isSuccessor ? (snapshot?.summary?.legacyFlags ?? []) : []}
          pending={pending}
          error={error}
          reducedMotion={preferences.reducedMotion}
          onBack={isSuccessor ? () => goTo(null) : () => goTo({ step: "election" })}
          onTakeOffice={isSuccessor ? startSuccessor : () => goTo({ step: "briefing" })}
        />
      </GameShell>
    );
  } else if (step === "briefing") {
    content = (
      <GameShell scrollable scene="ceremony" sceneIntensity="deep">
        <BriefingScreen
          country={snapshot.game.country}
          onBack={() => goTo({ step: "inauguration", mode: "new" })}
          onProceed={enterGovernment}
        />
      </GameShell>
    );
  } else if (snapshot === null) {
    content = (
      <GameShell scrollable scene="home" sceneIntensity="soft" scenePriority>
        <CoverScreen
          pending={pending}
          error={error}
          canResume={Boolean(savedGameId)}
          onNewMandate={() => goTo({ step: "country" })}
          onResume={() => {
            setError(null);
            setResumeFailedFor(null);
          }}
          onOpenArchive={() => setDialog("chronicle")}
          onOpenSettings={() => setDialog("settings")}
        />
      </GameShell>
    );
  } else if (snapshot.game.status === "active" || feedback) {
    const { game, currentCard } = snapshot;
    const inheritedFlags = inheritance?.inheritedFlags ?? [];
    content = (
      <GameScreen
        key={`${game.id}:${game.turn}:${feedback ? "feedback" : "decision"}`}
        game={game}
        card={currentCard}
        procedure={snapshot.procedure}
        feedback={feedback}
        pending={pending}
        error={error}
        notice={
          inheritedFlags.length > 0 ? (
            <>
              <strong>Heranças do governo anterior:</strong>{" "}
              {inheritedFlags.map((flag) => flag.label).join(" ")}
            </>
          ) : null
        }
        exactEffects={preferences.exactEffects}
        reducedMotion={preferences.reducedMotion}
        onDecide={decide}
        onContinue={() => setFeedback(null)}
        onOpenChronicle={() => setDialog("chronicle")}
        onOpenSettings={() => setDialog("settings")}
      />
    );
  } else {
    content = (
      <GameShell scrollable>
        <EndingScreen
          snapshot={snapshot}
          pending={pending}
          error={error}
          onReadChronicle={() => setDialog("chronicle")}
          onStartSuccessor={() => goTo({ step: "inauguration", mode: "successor" })}
          onBackToCover={backToCover}
        />
      </GameShell>
    );
  }

  const chronicleGameId = snapshot?.game.id ?? savedGameId;

  return (
    <div className="app" data-reduced-motion={preferences.reducedMotion ? "true" : undefined}>
      {content}

      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>

      {dialog === "chronicle" && chronicleGameId ? (
        <ChronicleDrawer gameId={chronicleGameId} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "settings" ? (
        <SettingsDialog
          preferences={preferences}
          onClose={() => setDialog(null)}
          onOpenTutorial={() => setDialog("tutorial")}
          onAbandon={governmentIsOpen ? () => setDialog("abandon") : null}
        />
      ) : null}
      {dialog === "abandon" ? (
        <Modal
          title="Abandonar o mandato?"
          onClose={() => setDialog("settings")}
          actions={
            <>
              <button type="button" className="btn" onClick={() => setDialog("settings")}>
                Manter o mandato
              </button>
              <button type="button" className="btn btn--primary" onClick={backToCover}>
                Abandonar
              </button>
            </>
          }
        >
          <p>
            O governo continua registrado no arquivo com todas as decisões e a crônica. Nada é
            apagado.
          </p>
          <p>
            <strong>Este navegador deixará de reabri-lo.</strong> Não existe lista de governos
            anteriores, então você só voltaria a ele guardando o endereço agora.
          </p>
        </Modal>
      ) : null}
      {dialog === "tutorial" ? <Tutorial onFinish={finishTutorial} /> : null}
    </div>
  );
}
