import {
  libelleNombreRetours,
  libelleNoteMoyenne,
  type RetoursActivite,
} from "@/lib/retour-activite";
import { clientSession } from "@/lib/supabase/serveur";

/**
 * La note moyenne et les commentaires d'une activité passée, réservés à son organisateur et au
 * conseil syndical (RLS `retours_activite`) : n'affiche rien pour qui d'autre la consulte.
 */
export async function Retours({ identifiant }: { identifiant: string }) {
  const supabase = await clientSession();
  const { data } = await supabase
    .rpc("retours_activite", { identifiant })
    .maybeSingle<RetoursActivite>();
  if (!data) return null;

  return (
    <section
      aria-labelledby="retours-titre"
      className="flex flex-col gap-space-sm rounded-lg bg-surface-container-low p-4"
    >
      <h2
        id="retours-titre"
        className="font-headline text-headline-sm text-on-surface"
      >
        Retours des participants
      </h2>
      <p className="text-body-lg text-on-surface">
        {libelleNoteMoyenne(data.note_moyenne)}
        {data.nombre_retours > 0 && (
          <span className="text-on-surface-variant">
            {" "}
            · {libelleNombreRetours(data.nombre_retours)}
          </span>
        )}
      </p>
      {data.commentaires.length > 0 && (
        <ul aria-label="Commentaires" className="flex flex-col gap-space-sm">
          {data.commentaires.map((retour, index) => (
            // Index en clé : la RPC ne renvoie ni auteur ni identifiant pour chaque commentaire,
            // pour rester anonymisée à la lecture. La liste est réaffichée en entier à chaque
            // rendu, jamais réordonnée localement.
            <li key={index} className="text-body-md text-on-surface">
              « {retour.commentaire} » — {retour.note} / 5
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
