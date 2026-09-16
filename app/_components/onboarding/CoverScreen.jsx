import styles from "./CoverScreen.module.css";
import { PresidentialSeal } from "./PresidentialSeal";

// Title screen (design 2a).
export function CoverScreen({ pending, error, canResume, onNewMandate, onResume, onOpenSettings }) {
  return (
    <main className={styles.cover}>
      <div className={styles.hero}>
        <PresidentialSeal variant="brass" />
        <h1 className={styles.title}>Decretum</h1>
        <p className={styles.motto}>Salus Populi Suprema Lex</p>
        <p className={styles.quote}>“Toda decisão cria um governo. Toda concessão cria um dono.”</p>
      </div>

      <div className={styles.sealedDossier} aria-hidden="true">
        <span className={styles.dossierLabel}>Arquivo constitucional</span>
        <span className={styles.dossierTitle}>Dossiê lacrado da República</span>
        <span className={styles.dossierRule} />
        <span className={styles.dossierFooter}>
          <span className={styles.wax}>Lacre</span>
          <span className={styles.dossierStatus}>
            {canResume ? "Mandato salvo" : "Sem mandato ativo"}
          </span>
        </span>
      </div>

      <div className={styles.actions}>
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
        <div className={styles.secondaryRow}>
          <button
            type="button"
            className={`btn ${styles.secondary}`}
            onClick={onResume}
            disabled={!canResume || pending}
          >
            Continuar
          </button>
          <button type="button" className={`btn ${styles.secondary}`} onClick={onOpenSettings}>
            Configurações
          </button>
        </div>
        {canResume ? null : <p className={styles.note}>Nenhum mandato salvo para continuar</p>}
      </div>
    </main>
  );
}
