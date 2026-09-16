"use client";

import { useState } from "react";
import { Modal } from "./Modal";

// Four contextual steps (GDD §23). It never changes the game itself.
const STEPS = [
  {
    title: "Você governa por decisões mensais.",
    text: "A cada mês, uma autoridade traz um dilema na carta central.",
  },
  {
    title: "Escolha um caminho.",
    text: "Arraste a carta para a esquerda ou para a direita, ou use os botões e as setas do teclado.",
  },
  {
    title: "Toda decisão altera forças políticas.",
    text: "Antes de decidir, examine uma opção para ver as setas de tendência de Povo, Mercado, Congresso e Instituições.",
  },
  {
    title: "Zero destrói uma força; cem permite que ela domine.",
    text: "Os dois extremos encerram o governo. Governar é impedir que qualquer força se torne absoluta.",
  },
];

export function Tutorial({ onFinish }) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <Modal
      title={`Tutorial · ${step + 1} de ${STEPS.length}`}
      onClose={onFinish}
      actions={
        <>
          <button type="button" className="btn btn--ghost" onClick={onFinish}>
            Pular
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => (isLast ? onFinish() : setStep(step + 1))}
          >
            {isLast ? "Começar" : "Próximo"}
          </button>
        </>
      }
    >
      <p className="tutorial__title">{STEPS[step].title}</p>
      <p>{STEPS[step].text}</p>
    </Modal>
  );
}
