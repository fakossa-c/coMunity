import { Icone } from "./icone";

type Props = {
  /** Nom de l'information, pour le lecteur d'écran (« Téléphone »). */
  libelle: string;
  visible: boolean;
  /** Information toujours visible (le pseudo) : cadenas, non cliquable. */
  verrou?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

// Sur ordinateur, les pilules ont toutes la même largeur (176 px) : elles s'alignent en colonne.
const classes =
  "inline-flex min-h-cible shrink-0 items-center justify-center gap-1.5 rounded-full px-4 font-headline text-label-lg desktop:w-44";

/**
 * Pilule qui dit si une information du profil est vue par les voisins : verte « Visible », bleue
 * « Masqué » sur mobile et « Privé » sur ordinateur, où elle est compacte (176 px). Verrouillée,
 * elle porte un cadenas et ne se touche pas. Se place en `fin` d'une ligne de `CarteLignes`.
 */
export function BoutonVisibilite({
  libelle,
  visible,
  verrou = false,
  onClick,
  disabled,
}: Props) {
  const ton = visible
    ? "bg-fond-confirme text-texte-confirme"
    : "bg-surface-container-high text-on-surface";

  if (verrou) {
    return (
      <span className={`${classes} ${ton}`}>
        <Icone nom="lock" taille={20} />
        <span className="sr-only">{libelle} : </span>
        Visible
        <span className="sr-only">, toujours</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${classes} ${ton} transition-[transform,background-color,color] active:translate-y-0.5 disabled:opacity-50 desktop:duration-(--duree-courte) desktop:ease-journal desktop:not-disabled:hover:not-active:-translate-y-0.5`}
    >
      <Icone nom={visible ? "visibility" : "visibility_off"} taille={20} />
      <span className="sr-only">{libelle} : </span>
      {visible ? (
        "Visible"
      ) : (
        <>
          <span className="desktop:hidden">Masqué</span>
          <span className="hidden desktop:inline">Privé</span>
        </>
      )}
    </button>
  );
}
