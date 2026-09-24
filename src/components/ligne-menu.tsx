import Link from "next/link";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = {
  icone: NomIcone;
  titre: string;
  /** Une ligne qui dit ce qu'on trouve derrière : « Contrôlez les informations partagées » */
  detail?: string;
  /** carte : page Profil (72 px, blanc bordé) · feuille : dans le menu du profil (64 px, bleu très clair) */
  variante?: "carte" | "feuille";
  onClick?: () => void;
} &
  // Avec `href`, la ligne est un lien vers sa page, avec un chevron ; sinon un bouton.
  (
    | { href: string; type?: never }
    | { href?: undefined; type?: "button" | "submit" }
  );

const variantes = {
  carte:
    "min-h-[72px] border-[1.5px] border-bordure-carte bg-fond-carte hover:bg-surface-container-low",
  feuille: "min-h-ligne bg-surface-container-low hover:bg-surface-container",
};

/** Entrée de menu : pastille pêche, titre, description, chevron quand elle mène à une page. */
export function LigneMenu({
  icone,
  titre,
  detail,
  variante = "carte",
  onClick,
  ...cible
}: Props) {
  const classes = `flex w-full items-center gap-space-sm rounded-lg px-4 py-2 text-left ${variantes[variante]}`;
  const contenu = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-fond-action text-texte-action">
        <Icone nom={icone} taille={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-headline text-label-lg text-on-surface">
          {titre}
        </span>
        {detail && (
          <span className="text-body-md text-on-surface-variant">{detail}</span>
        )}
      </span>
      {cible.href && (
        <span className="text-on-surface-variant">
          <Icone nom="chevron_right" taille={24} />
        </span>
      )}
    </>
  );

  if (cible.href) {
    return (
      <Link href={cible.href} onClick={onClick} className={classes}>
        {contenu}
      </Link>
    );
  }
  return (
    <button type={cible.type ?? "button"} onClick={onClick} className={classes}>
      {contenu}
    </button>
  );
}
