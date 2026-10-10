/**
 * « Nouveau » : une annonce publiée depuis moins de 7 jours. Texte terre cuite en 800 précédé d'un
 * point plein de 9 px, sans fond : le pêche reste celui de l'action et de la pastille de type.
 */
export function Nouveau() {
  return (
    <span className="inline-flex min-h-8 items-center gap-1.5 font-headline text-etiquette font-extrabold text-texte-date before:size-[9px] before:rounded-full before:bg-current before:content-['']">
      Nouveau
    </span>
  );
}
