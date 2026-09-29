type Props = { titre: string; sousTitre?: string };

/**
 * Titre d'une page du Profil : celui de `TitrePage` sur mobile, le très grand titre de la
 * présentation Journal sur ordinateur.
 */
export function TitreProfil({ titre, sousTitre }: Props) {
  return (
    <div className="mb-space-lg desktop:mb-space-lg">
      <h1 className="font-headline text-headline-xl-mobile [overflow-wrap:anywhere] text-on-surface desktop:text-titre-journal">
        {titre}
      </h1>
      {sousTitre && (
        <p className="mt-1 max-w-[65ch] text-body-lg text-on-surface-variant desktop:mt-2">
          {sousTitre}
        </p>
      )}
    </div>
  );
}
