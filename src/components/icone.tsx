import { icones, type NomIcone } from "./icones";

type Props = {
  nom: NomIcone;
  plein?: boolean;
  className?: string;
};

/** Icône décorative : le texte qui l'accompagne porte le sens. */
export function Icone({ nom, plein = false, className }: Props) {
  const trace = icones[nom];
  return (
    <svg
      viewBox="0 -960 960 960"
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      className={className}
    >
      <path d={plein ? trace.plein : trace.contour} />
    </svg>
  );
}
