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

const classes =
  "inline-flex min-h-cible shrink-0 items-center gap-1.5 rounded-full px-4 font-headline text-label-lg";

/**
 * Pilule qui dit si une information du profil est vue par les voisins : verte « Visible », bleue
 * « Masqué ». Verrouillée, elle porte un cadenas et ne se touche pas. Se place en `fin` d'une
 * ligne de `CarteLignes`.
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
      aria-pressed={visible}
      onClick={onClick}
      disabled={disabled}
      className={`${classes} ${ton} transition-transform active:translate-y-0.5 disabled:opacity-50`}
    >
      <Icone nom={visible ? "visibility" : "visibility_off"} taille={20} />
      <span className="sr-only">{libelle} : </span>
      {visible ? "Visible" : "Masqué"}
    </button>
  );
}
