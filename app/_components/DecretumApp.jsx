"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
import { BriefingScreen } from "./onboarding/BriefingScreen";
import { CoverScreen } from "./onboarding/CoverScreen";
import { InaugurationScreen } from "./onboarding/InaugurationScreen";
import { SettingsDialog } from "./SettingsDialog";
import { Tutorial } from "./Tutorial";

function toSnapshot(response) {
  return {
    game: response.game,
    currentCard: response.currentCard ?? response.nextCard ?? null,
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

export default function DecretumApp() {
  const preferences = useSyncExternalStore(subscribeStorage, getPreferences, getServerPreferences);
  const savedGameId = useSyncExternalStore(subscribeStorage, readSavedGameId, readServerGameId);

  const [snapshot, setSnapshot] = useState(null);
  const [resumeFailedFor, setResumeFailedFor] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [inheritance, setInheritance] = useState(null);
  // null | { step: "briefing" } | { step: "inauguration", mode: "new" | "successor" }
  const [onboarding, setOnboarding] = useState(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [announcement, setAnnouncement] = useState("");

  const shouldResume = Boolean(savedGameId) && snapshot === null && resumeFailedFor !== savedGameId;

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

  function goTo(nextOnboarding) {
    setError(null);
    setOnboarding(nextOnboarding);
  }

  async function startGame() {
    setPending(true);
    setError(null);
    try {
      const response = await api.createGame();
      saveGameId(response.game.id);
      setSnapshot(toSnapshot(response));
      setFeedback(null);
      setInheritance(null);
      setOnboarding(null);
      if (!preferences.tutorialSeen) setDialog("tutorial");
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setPending(false);
    }
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
      setPending(false);
    }
  }

  function backToCover() {
    clearSavedGameId();
    setSnapshot(null);
    setFeedback(null);
    setInheritance(null);
    setOnboarding(null);
    setError(null);
  }

  function finishTutorial() {
    updatePreferences({ tutorialSeen: true });
    setDialog(null);
  }

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
  } else if (onboarding?.step === "briefing") {
    content = (
      <GameShell scrollable>
        <BriefingScreen
          onBack={() => goTo(null)}
          onProceed={() => goTo({ step: "inauguration", mode: "new" })}
        />
      </GameShell>
    );
  } else if (onboarding?.step === "inauguration") {
    const isSuccessor = onboarding.mode === "successor";
    content = (
      <GameShell scrollable>
        <InaugurationScreen
          mode={onboarding.mode}
          legacyFlags={isSuccessor ? (snapshot?.summary?.legacyFlags ?? []) : []}
          pending={pending}
          error={error}
          onBack={() => goTo(isSuccessor ? null : { step: "briefing" })}
          onTakeOffice={isSuccessor ? startSuccessor : startGame}
        />
      </GameShell>
    );
  } else if (snapshot === null) {
    content = (
      <GameShell scrollable>
        <CoverScreen
          pending={pending}
          error={error}
          canResume={Boolean(savedGameId)}
          onNewMandate={() => goTo({ step: "briefing" })}
          onResume={() => {
            setError(null);
            setResumeFailedFor(null);
          }}
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

  return (
    <div className="app" data-reduced-motion={preferences.reducedMotion ? "true" : undefined}>
      {content}

      <div className="visually-hidden" aria-live="polite">
        {announcement}
      </div>

      {dialog === "chronicle" && snapshot ? (
        <ChronicleDrawer gameId={snapshot.game.id} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "settings" ? (
        <SettingsDialog
          preferences={preferences}
          onClose={() => setDialog(null)}
          onOpenTutorial={() => setDialog("tutorial")}
        />
      ) : null}
      {dialog === "tutorial" ? <Tutorial onFinish={finishTutorial} /> : null}
    </div>
  );
}
