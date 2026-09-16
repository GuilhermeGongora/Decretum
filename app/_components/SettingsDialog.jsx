"use client";

import { updatePreferences } from "@/app/_lib/storage";
import { Modal } from "./Modal";

export function SettingsDialog({ preferences, onClose, onOpenTutorial }) {
  return (
    <Modal title="Pausa e configurações" onClose={onClose}>
      <p>O governo aguarda. Não há tempo limite para decidir.</p>
      <label className="setting">
        <input
          type="checkbox"
          checked={preferences.exactEffects}
          onChange={(event) => updatePreferences({ exactEffects: event.target.checked })}
        />
        <span>
          <strong>Efeitos exatos</strong>
          <br />
          Mostra os números antes de decidir. Não altera regras nem pontuação.
        </span>
      </label>
      <label className="setting">
        <input
          type="checkbox"
          checked={preferences.reducedMotion}
          onChange={(event) => updatePreferences({ reducedMotion: event.target.checked })}
        />
        <span>
          <strong>Reduzir movimento</strong>
          <br />
          Troca deslocamentos e pulsações por atualizações instantâneas.
        </span>
      </label>
      <button type="button" className="btn" onClick={onOpenTutorial}>
        Rever tutorial
      </button>
    </Modal>
  );
}
