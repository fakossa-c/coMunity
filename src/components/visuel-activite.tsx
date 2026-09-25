import { Icone } from "./icone";
import type { NomIcone } from "./icones";

/** En tête de fiche, à la place de la photo tant que l'activité n'en a pas : son pictogramme. */
export function VisuelActivite({ pictogramme }: { pictogramme: NomIcone }) {
  return (
    <div className="flex h-[150px] items-center justify-center rounded-lg bg-fond-action text-texte-action">
      <Icone nom={pictogramme} className="size-20" />
    </div>
  );
}
