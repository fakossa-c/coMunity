type Props = {
  initiale: string;
  /** pêche : un voisin · marine : la personne connectée */
  variante?: "peche" | "marine";
  /** En px : 72 sur la page Profil, 52 dans le menu, 40 par défaut. */
  taille?: 40 | 52 | 72;
};

const couleurs = {
  peche: "bg-fond-action text-texte-action",
  marine: "bg-inverse-surface text-inverse-on-surface",
};

const textes = {
  40: "text-label-lg",
  52: "text-headline-sm",
  72: "text-headline-lg",
};

/** Pastille d'initiale. Décorative : le nom l'accompagne toujours. */
export function Avatar({ initiale, variante = "peche", taille = 40 }: Props) {
  return (
    <span
      aria-hidden="true"
      style={{ width: taille, height: taille }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-headline font-extrabold ${couleurs[variante]} ${textes[taille]}`}
    >
      {initiale}
    </span>
  );
}
