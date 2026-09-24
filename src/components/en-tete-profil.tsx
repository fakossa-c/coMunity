import { Avatar } from "./avatar";

type Props = {
  initiale: string;
  nom: string;
  /** « Bât. B, 2e étage » */
  adresse?: string;
  /** grand : page Profil (avatar 72, titre de page) · compact : haut du menu du profil (avatar 52) */
  taille?: "grand" | "compact";
};

/** Identité de la personne connectée, avec l'avatar marine des en-têtes. */
export function EnTeteProfil({
  initiale,
  nom,
  adresse,
  taille = "grand",
}: Props) {
  const grand = taille === "grand";
  const Nom = grand ? "h1" : "p";

  return (
    <div className="flex items-center gap-space-md">
      <Avatar initiale={initiale} variante="marine" taille={grand ? 72 : 52} />
      <div className="flex min-w-0 flex-col">
        <Nom
          className={`font-headline [overflow-wrap:anywhere] text-on-surface ${grand ? "text-headline-xl-mobile" : "text-headline-sm"}`}
        >
          {nom}
        </Nom>
        {adresse && (
          <p className="text-body-md text-on-surface-variant">{adresse}</p>
        )}
      </div>
    </div>
  );
}
