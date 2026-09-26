type Props = {
  /** Absent (visiteur, membre du conseil syndical sans prénom) : « Bonjour ! ». */
  prenom?: string | null;
  /** « Bât. B, 2e étage. » : pas encore en base (décision du 23/09/2026), donc jamais passé. */
  adresse?: string;
  /** « 4 activités prévues cette semaine ». */
  resume?: string;
};

/** Message d'accueil personnalisé, titre de l'Accueil sous l'en-tête de résidence ; défile avec lui. */
export function Salutation({ prenom, adresse, resume }: Props) {
  return (
    <div className="mb-space-sm flex flex-col gap-1">
      <h1 className="font-headline text-headline-xl-mobile text-on-surface desktop:text-headline-xl">
        {prenom ? `Bonjour ${prenom} !` : "Bonjour !"}
      </h1>
      {adresse && <p className="text-body-lg text-on-surface">{adresse}</p>}
      {resume && (
        <p className="text-body-lg text-on-surface-variant">{resume}</p>
      )}
    </div>
  );
}
