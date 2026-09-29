type Props = {
  /** Absent (visiteur, membre du conseil syndical sans prénom) : « Bonjour ! ». */
  prenom?: string | null;
  /** « 4 activités prévues cette semaine ». */
  resume?: string;
};

/**
 * Message d'accueil personnalisé, titre de l'Accueil sous l'en-tête de résidence ; défile avec lui.
 * Sur ordinateur, c'est le très grand titre de la présentation Journal.
 */
export function Salutation({ prenom, resume }: Props) {
  return (
    <div className="mb-space-sm flex flex-col gap-1">
      <h1 className="font-headline text-headline-xl-mobile text-on-surface desktop:text-titre-journal desktop:font-extrabold desktop:tracking-[-0.025em]">
        {prenom ? `Bonjour ${prenom} !` : "Bonjour !"}
      </h1>
      {resume && (
        <p className="text-body-lg text-on-surface-variant">{resume}</p>
      )}
    </div>
  );
}
