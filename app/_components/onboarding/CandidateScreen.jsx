import { useId } from "react";
import styles from "./CandidateScreen.module.css";

const PLATFORM_GROUPS = [
  { field: "style", source: "styles", legend: "Estilo de liderança" },
  { field: "coalition", source: "coalitions", legend: "Coligação" },
  { field: "promise", source: "promises", legend: "Principal promessa" },
];

function OptionGroup({ legend, name, options, value, onChange, inline = false }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options} data-inline={inline || undefined}>
        {options.map((option) => (
          <label key={option.key} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.key}
              checked={value === option.key}
              onChange={() => onChange(option.key)}
            />
            <span className={styles.optionBody}>
              <span className={styles.optionLabel}>{option.label ?? option.acronym}</span>
              {option.note ? <span className={styles.optionNote}>{option.note}</span> : null}
              {option.name && option.acronym ? (
                <span className={styles.optionNote}>
                  {option.name} · {option.lean}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const labelOf = (options, key) => options.find((option) => option.key === key);

// Candidate registration in two progressive regions — who the candidate is, then what they promise —
// with a registration card that fills in as the choices are made. The screen only collects a position;
// what each choice costs is decided by the server when the campaign is resolved.
export function CandidateScreen({ country, options, candidate, onChange, onBack, onProceed }) {
  const headingId = useId();
  const nameId = useId();
  const nameIsMissing = candidate.name.trim() === "";

  const treatment = labelOf(options.treatments, candidate.treatment);
  const party = labelOf(options.parties, candidate.party);
  const origin = labelOf(options.origins, candidate.origin);
  const style = labelOf(options.styles, candidate.style);
  const coalition = labelOf(options.coalitions, candidate.coalition);
  const promise = labelOf(options.promises, candidate.promise);

  function submit(event) {
    event.preventDefault();
    if (!nameIsMissing) onProceed();
  }

  return (
    <main className={styles.screen} aria-labelledby={headingId}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>Registro de candidatura · {country.name}</p>
        <h1 id={headingId} className={styles.title}>
          Quem se apresenta ao país?
        </h1>
        <p className={styles.lead}>
          Origem, estilo e aliança decidem quem atende o telefone quando o governo precisar de
          votos.
        </p>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.stages}>
          <section className={styles.stage} aria-labelledby={`${headingId}-identity`}>
            <p className={styles.stageLabel} id={`${headingId}-identity`}>
              <span className={styles.stageNumber}>1</span> Identidade política
            </p>

            <div className={styles.field}>
              <label className={styles.legend} htmlFor={nameId}>
                Nome de urna
              </label>
              <input
                id={nameId}
                className={styles.input}
                type="text"
                maxLength={60}
                autoComplete="off"
                value={candidate.name}
                onChange={(event) => onChange({ name: event.target.value })}
                placeholder="Como o país vai chamá-la ou chamá-lo"
              />
            </div>

            <OptionGroup
              legend="Forma de tratamento"
              name="treatment"
              options={options.treatments}
              value={candidate.treatment}
              onChange={(key) => onChange({ treatment: key })}
              inline
            />
            <OptionGroup
              legend="Partido"
              name="party"
              options={options.parties}
              value={candidate.party}
              onChange={(key) => onChange({ party: key })}
              inline
            />
            <OptionGroup
              legend="Origem política"
              name="origin"
              options={options.origins}
              value={candidate.origin}
              onChange={(key) => onChange({ origin: key })}
            />
          </section>

          <section className={styles.stage} aria-labelledby={`${headingId}-platform`}>
            <p className={styles.stageLabel} id={`${headingId}-platform`}>
              <span className={styles.stageNumber}>2</span> Plataforma e coalizão
            </p>

            {PLATFORM_GROUPS.map((group) => (
              <OptionGroup
                key={group.field}
                legend={group.legend}
                name={group.field}
                options={options[group.source]}
                value={candidate[group.field]}
                onChange={(key) => onChange({ [group.field]: key })}
              />
            ))}
          </section>

          <aside className={styles.summary} aria-live="polite">
            <p className={styles.summaryLabel}>Ficha de registro</p>
            <p className={styles.summaryName} data-empty={nameIsMissing || undefined}>
              {nameIsMissing ? "Sem nome de urna" : candidate.name}
            </p>
            <p className={styles.summaryParty}>
              {party?.acronym} · {treatment?.label}
            </p>
            <dl className={styles.summaryFacts}>
              <div>
                <dt>Origem</dt>
                <dd>{origin?.label}</dd>
              </div>
              <div>
                <dt>Estilo</dt>
                <dd>{style?.label}</dd>
              </div>
              <div>
                <dt>Coligação</dt>
                <dd>{coalition?.label}</dd>
              </div>
              <div>
                <dt>Promessa</dt>
                <dd>{promise?.label}</dd>
              </div>
            </dl>
            <p className={styles.summaryNote}>
              O adversário e a campanha só aparecem depois do registro.
            </p>
          </aside>
        </div>

        <div className={styles.actions}>
          <button type="button" className="btn" onClick={onBack}>
            Voltar
          </button>
          <button
            type="submit"
            className={`btn btn--primary ${styles.proceed}`}
            disabled={nameIsMissing}
          >
            Iniciar a campanha
          </button>
          {nameIsMissing ? (
            <p className={styles.hint}>Informe o nome de urna para seguir.</p>
          ) : null}
        </div>
      </form>
    </main>
  );
}
