"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { PILLARS } from "@/app/_lib/text";
import styles from "./CabinetRoom.module.css";

// Same contract as the dossier's portrait: decorative artwork when there is any, initials when there
// is none, and initials again if the file fails to load. The name is always written beside it.
function Portrait({ person }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(person?.portrait) && !failed;

  return (
    <span className={styles.portrait}>
      {showImage ? (
        <Image
          className={styles.portraitImage}
          src={person.portrait}
          alt=""
          fill
          sizes="48px"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{person?.initials ?? "—"}</span>
      )}
    </span>
  );
}

// The three readings a minister is described by. Words, never scores: the numbers stay on the server.
function Attributes({ attributes }) {
  if (!attributes) return null;
  const readings = [
    ["Competência", attributes.competence],
    ["Lealdade", attributes.loyalty],
    ["Influência", attributes.influence],
  ].filter(([, value]) => Boolean(value));

  return (
    <dl className={styles.readings}>
      {readings.map(([label, value]) => (
        <div key={label} className={styles.reading}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
      {attributes.traits?.length > 0 ? (
        <div className={styles.reading}>
          <dt>Perfil</dt>
          <dd>{attributes.traits.join(" · ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}

// What the server says a change would do, said out loud. It sends a direction per pillar and never a
// number; the sentence is built here, the way the pillar bands already are.
const TREND_WORDS = { up: "favoravelmente", down: "negativamente" };

function Trends({ trends, label = "Como as forças tendem a reagir" }) {
  if (!trends?.length) return null;

  return (
    <div className={styles.trends}>
      <p className={styles.trendsLabel}>{label}</p>
      <ul className={styles.trendsList}>
        {trends.map(({ pillar, direction }) => (
          <li key={pillar} data-direction={direction}>
            {PILLARS.find((entry) => entry.key === pillar)?.name ?? pillar} tende a reagir{" "}
            {TREND_WORDS[direction]}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ACTION_LABELS = {
  appoint: "Nomear",
  dismiss: "Exonerar",
  replace: "Substituir",
};

export function CabinetRoom({ cabinet, turn, pending = false, error = null, onAct, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  // null = the overview; otherwise the ministry being read.
  const [openSeat, setOpenSeat] = useState(null);
  // { action, candidateId } while a decision is being confirmed.
  const [confirming, setConfirming] = useState(null);
  const lockRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    // Whoever opened the room is where the reader is put back when it closes.
    const opener = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      // After the dialog is gone, never before: closing one hands focus back to the body, which
      // would wipe anything set while it was still open.
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  if (!cabinet) return null;

  const seat = openSeat
    ? (cabinet.seats.find((entry) => entry.ministryKey === openSeat) ?? null)
    : null;
  const candidatesFor = (ministryKey) =>
    cabinet.candidates.filter((candidate) => candidate.eligibleMinistries.includes(ministryKey));

  // The reading that belongs to the operation being confirmed: arriving over somebody costs more
  // than arriving into an empty chair, and the server already worked out both.
  const confirmingCandidate = confirming?.candidateId
    ? (cabinet.candidates.find((entry) => entry.id === confirming.candidateId) ?? null)
    : null;
  const confirmingTrends =
    confirming?.action === "dismiss"
      ? (seat?.dismissTrends ?? [])
      : confirming?.action === "replace"
        ? (confirmingCandidate?.replaceTrends ?? [])
        : (confirmingCandidate?.appointTrends ?? []);

  async function confirm() {
    // The ref blocks a second submission before React has re-rendered the pending state.
    if (lockRef.current || pending) return;
    lockRef.current = true;
    const accepted = await onAct({
      action: confirming.action,
      ministryKey: seat.ministryKey,
      candidateId: confirming.candidateId,
    });
    lockRef.current = false;
    if (accepted) {
      setConfirming(null);
      setOpenSeat(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.room}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.header}>
        <div>
          <h2 id={titleId} className={styles.title}>
            Sala do Gabinete
          </h2>
          <p className={styles.meta}>
            {cabinet.actionAvailable
              ? "Uma mudança pode ser assinada neste mês"
              : "Nenhuma mudança pode ser assinada neste mês"}
          </p>
        </div>
        <button type="button" className={styles.close} onClick={onClose}>
          Fechar
        </button>
      </header>

      <div className={styles.body}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {seat === null ? (
          <ul className={styles.seats}>
            {cabinet.seats.map((entry) => (
              <li key={entry.ministryKey}>
                <article className={styles.seat} data-status={entry.status}>
                  <h3 className={styles.ministry}>{entry.ministryName}</h3>
                  {entry.status === "occupied" ? (
                    <>
                      <div className={styles.person}>
                        <Portrait person={entry.occupant} />
                        <div>
                          <p className={styles.personName}>{entry.occupant.name}</p>
                          <p className={styles.personTitle}>{entry.occupant.publicTitle}</p>
                        </div>
                      </div>
                      <Attributes attributes={entry.publicAttributes} />
                      <p className={styles.tenure}>
                        No cargo desde o mês {String(entry.appointedAtTurn).padStart(2, "0")}
                      </p>
                    </>
                  ) : (
                    <p className={styles.vacant}>
                      <strong>Pasta vaga.</strong> A Presidência ainda não indicou um titular.
                    </p>
                  )}
                  <button
                    type="button"
                    className={styles.open}
                    onClick={() => {
                      setOpenSeat(entry.ministryKey);
                      setConfirming(null);
                    }}
                  >
                    Abrir pasta
                    <span className="visually-hidden"> — {entry.ministryName}</span>
                  </button>
                </article>
              </li>
            ))}
          </ul>
        ) : null}

        {seat !== null && confirming === null ? (
          <section className={styles.detail} aria-labelledby={`${titleId}-detail`}>
            <button type="button" className={styles.back} onClick={() => setOpenSeat(null)}>
              Voltar ao gabinete
            </button>
            <h3 id={`${titleId}-detail`} className={styles.detailTitle}>
              {seat.ministryName}
            </h3>
            {seat.note ? <p className={styles.note}>{seat.note}</p> : null}

            {seat.status === "occupied" ? (
              <div className={styles.person}>
                <Portrait person={seat.occupant} />
                <div>
                  <p className={styles.personName}>{seat.occupant.name}</p>
                  <p className={styles.personTitle}>{seat.occupant.publicTitle}</p>
                </div>
              </div>
            ) : (
              <p className={styles.vacant}>
                <strong>Pasta vaga.</strong> A Presidência ainda não indicou um titular.
              </p>
            )}
            <Attributes attributes={seat.publicAttributes} />

            {seat.availableActions.length === 0 ? (
              <p className={styles.locked}>Nenhuma ação disponível nesta pasta neste mês.</p>
            ) : null}

            {seat.availableActions.includes("dismiss") ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => setConfirming({ action: "dismiss", candidateId: undefined })}
              >
                Exonerar {seat.occupant.name}
              </button>
            ) : null}
            {seat.availableActions.includes("dismiss") ? (
              <Trends trends={seat.dismissTrends} label="Se a pasta ficar vaga" />
            ) : null}

            {seat.availableActions.some(
              (action) => action === "appoint" || action === "replace",
            ) ? (
              <>
                <h4 className={styles.candidatesTitle}>Nomes disponíveis</h4>
                <ul className={styles.candidates}>
                  {candidatesFor(seat.ministryKey).map((candidate) => (
                    <li key={candidate.id}>
                      <article className={styles.candidate}>
                        <div className={styles.person}>
                          <Portrait person={candidate} />
                          <div>
                            <p className={styles.personName}>{candidate.name}</p>
                            <p className={styles.personTitle}>{candidate.publicTitle}</p>
                          </div>
                        </div>
                        {candidate.biography ? (
                          <p className={styles.biography}>{candidate.biography}</p>
                        ) : null}
                        <Attributes attributes={candidate.publicAttributes} />
                        <Trends
                          trends={
                            seat.status === "occupied"
                              ? candidate.replaceTrends
                              : candidate.appointTrends
                          }
                          label="Se este nome assumir"
                        />
                        <button
                          type="button"
                          className={styles.action}
                          onClick={() =>
                            setConfirming({
                              action: seat.status === "occupied" ? "replace" : "appoint",
                              candidateId: candidate.id,
                            })
                          }
                        >
                          {seat.status === "occupied" ? "Substituir por" : "Nomear"}{" "}
                          {candidate.name}
                        </button>
                      </article>
                    </li>
                  ))}
                  {candidatesFor(seat.ministryKey).length === 0 ? (
                    <li className={styles.locked}>
                      Nenhum nome disponível para esta pasta no momento.
                    </li>
                  ) : null}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}

        {seat !== null && confirming !== null ? (
          <section className={styles.confirm} aria-labelledby={`${titleId}-confirm`}>
            <h3 id={`${titleId}-confirm`} className={styles.detailTitle}>
              {ACTION_LABELS[confirming.action]} · {seat.ministryName}
            </h3>
            <dl className={styles.readings}>
              <div className={styles.reading}>
                <dt>Pasta</dt>
                <dd>{seat.ministryName}</dd>
              </div>
              <div className={styles.reading}>
                <dt>Titular anterior</dt>
                <dd>{seat.occupant ? seat.occupant.name : "Pasta vaga"}</dd>
              </div>
              <div className={styles.reading}>
                <dt>Novo titular</dt>
                <dd>
                  {confirming.candidateId
                    ? (cabinet.candidates.find((entry) => entry.id === confirming.candidateId)
                        ?.name ?? "—")
                    : "Pasta ficará vaga"}
                </dd>
              </div>
              <div className={styles.reading}>
                <dt>Mês</dt>
                <dd>{String(turn).padStart(2, "0")}</dd>
              </div>
            </dl>
            <Trends trends={confirmingTrends} />
            <p className={styles.warning}>
              Esta decisão será registrada na crônica e consumirá sua ação de gabinete deste mês.
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setConfirming(null)}
                disabled={pending}
              >
                Voltar
              </button>
              <button
                type="button"
                className={styles.action}
                onClick={confirm}
                disabled={pending}
                aria-busy={pending || undefined}
              >
                {pending ? "Registrando…" : "Confirmar"}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </dialog>
  );
}
