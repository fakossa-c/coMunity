import { Icone } from "./icone";

type Taille = {
  /** En px : 72 sur la page Profil, 52 dans le menu et les listes du syndic, 40 par défaut. */
  taille?: 40 | 52 | 72;
};

type Props = Taille &
  (
    | {
        /** pêche : un voisin · marine : la personne connectée · neutre : un résident dans une liste de l'espace syndic. */
        variante?: "peche" | "marine" | "neutre";
        initiale: string;
        /** Adresse d'une photo : elle remplace l'initiale, qui reste la valeur par défaut. */
        photo?: string;
      }
    | {
        /** Un compte qui attend sa validation : cercle pointillé et sablier, sans initiale ni photo. */
        variante: "attente";
        initiale?: never;
        photo?: never;
      }
  );

const couleurs = {
  peche: "bg-fond-action text-texte-action",
  marine: "bg-inverse-surface text-inverse-on-surface",
  neutre: "bg-surface-container-high text-on-surface",
  attente: "border-2 border-dashed border-outline text-on-surface-variant",
};

const textes = {
  40: "text-label-lg",
  52: "text-headline-sm",
  72: "text-headline-lg",
};

/** Pastille d'initiale, ou photo. Décorative : le nom l'accompagne toujours (sauf `attente`, qui se nomme). */
export function Avatar({
  initiale,
  variante = "peche",
  taille = 40,
  photo,
}: Props) {
  const attente = variante === "attente";
  return (
    <span
      {...(attente
        ? { role: "img", "aria-label": "Compte en attente" }
        : { "aria-hidden": true })}
      style={{ width: taille, height: taille }}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-headline font-extrabold ${couleurs[variante]} ${textes[taille]}`}
    >
      {attente ? (
        <Icone nom="hourglass_top" taille={24} />
      ) : photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- photo du bucket privé, déjà compressée dans le navigateur
        <img src={photo} alt="" className="size-full object-cover" />
      ) : (
        initiale
      )}
    </span>
  );
}
