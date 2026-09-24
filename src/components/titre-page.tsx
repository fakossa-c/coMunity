type Props = { titre: string; sousTitre?: string };

/** Titre de rubrique en haut d'une page. Il défile avec le contenu. */
export function TitrePage({ titre, sousTitre }: Props) {
  return (
    <div className="mb-space-lg">
      <h1 className="font-headline text-headline-xl-mobile text-on-surface desktop:text-headline-xl">
        {titre}
      </h1>
      {sousTitre && (
        <p className="mt-1 max-w-[65ch] text-body-lg text-on-surface-variant">
          {sousTitre}
        </p>
      )}
    </div>
  );
}
