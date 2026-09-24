import { icones, type NomIcone } from "./icones";

/** En px : 20 badge, 22 puce ou catégorie, 24 défaut, 26 panneau ou navigation, 28 retour ou flottant. */
export type TailleIcone = 20 | 22 | 24 | 26 | 28;

type Props = {
  nom: NomIcone;
  /** Glyphe plein : onglet actif, choix segmenté actif, `check_circle`. */
  plein?: boolean;
  taille?: TailleIcone;
  /** Taille par classe, pour les usages antérieurs au design system 2a. */
  className?: string;
};

/** Icône décorative : le texte qui l'accompagne porte le sens. */
export function Icone({ nom, plein = false, taille, className }: Props) {
  const trace = icones[nom];
  const cote = taille ?? (className ? undefined : 24);
  return (
    <svg
      viewBox="0 -960 960 960"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      width={cote}
      height={cote}
      className={`shrink-0 ${className ?? ""}`}
    >
      <path d={plein ? trace.plein : trace.contour} />
    </svg>
  );
}
