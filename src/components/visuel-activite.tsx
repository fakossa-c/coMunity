import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  pictogramme: NomIcone;
  /** En haut d'une carte de l'Accueil : 128 px, sans arrondi (la carte arrondit ses coins). */
  enCarte?: boolean;
};

/** À la place de la photo tant que l'activité n'en a pas : son pictogramme, en tête de fiche ou de carte. */
export function VisuelActivite({ pictogramme, enCarte = false }: Props) {
  return (
    <div
      className={`flex items-center justify-center bg-fond-action text-texte-action ${
        enCarte ? "h-32" : "h-[150px] rounded-lg"
      }`}
    >
      <Icone nom={pictogramme} className={enCarte ? "size-16" : "size-20"} />
    </div>
  );
}
