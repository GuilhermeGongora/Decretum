"use client";

import { useEffect, useId, useRef } from "react";

// Native <dialog> provides focus trapping, Escape handling and an inert background.
// The native "close" event is not wired to onClose: the effect cleanup closes the dialog too, and in
// Strict Mode that late event would dismiss a dialog that was just reopened.
export function Modal({ title, onClose, children, actions }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="modal__header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Fechar
        </button>
      </header>
      <div className="modal__body">{children}</div>
      {actions ? <footer className="modal__footer">{actions}</footer> : null}
    </dialog>
  );
}
