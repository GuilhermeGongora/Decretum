import { BrandMark } from "@/app/_components/brand/BrandMark";
import styles from "./CoverScreen.module.css";

// Title screen. The reading column sits on the dark side of the Minerva scene, and the saved mandate
// is a file on the same desk — it carries the actions that belong to it instead of floating apart.
export function CoverScreen({
  pending,
  error,
  canResume,
  onNewMandate,
  onResume,
  onOpenArchive,
  onOpenSettings,
}) {
  return (
    <main className={styles.cover}>
      <div className={styles.column}>
        {/* The emblem opens the composition; the title below is the wordmark, and the artwork is
            never repeated large over Minerva. */}
        <div className={styles.crest}>
          <BrandMark variant="home" />
          <p className={styles.eyebrow}>Arquivo constitucional da República</p>
        </div>

        <h1 className={styles.title}>Decretum</h1>
        <p className={styles.motto}>Salus Populi Suprema Lex</p>
        <p className={styles.quote}>“Toda decisão cria um governo. Toda concessão cria um dono.”</p>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className={`btn btn--primary ${styles.primary}`}
          onClick={onNewMandate}
          disabled={pending}
        >
          Novo mandato
        </button>

        <article className={styles.dossier} data-sealed={!canResume || undefined}>
          <div className={styles.dossierHead}>
            <span className={styles.dossierLabel}>Dossiê do Palácio</span>
            <span className={styles.wax} aria-hidden="true">
              {canResume ? "Ativo" : "Lacre"}
            </span>
          </div>
          <p className={styles.dossierTitle}>
            {canResume ? "Mandato em curso" : "Nenhum mandato aberto"}
          </p>
          <span className={styles.dossierRule} aria-hidden="true" />
          <div className={styles.dossierActions}>
            <button
              type="button"
              className={`btn ${styles.secondary}`}
              onClick={onResume}
              disabled={!canResume || pending}
            >
              Continuar
            </button>
            <button
              type="button"
              className={`btn ${styles.secondary}`}
              onClick={onOpenArchive}
              disabled={!canResume}
            >
              Crônica
            </button>
          </div>
          {canResume ? null : <p className={styles.note}>Nenhum mandato salvo para continuar</p>}
        </article>

        <button
          type="button"
          className={`btn btn--link ${styles.settings}`}
          onClick={onOpenSettings}
        >
          Configurações
        </button>
      </div>
    </main>
  );
}
