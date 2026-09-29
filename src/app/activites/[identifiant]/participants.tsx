import { Avatar } from "@/components/avatar";
import { libelleAccompagnants } from "@/lib/inscription-activite";
import { adressesPhotosProfils } from "@/lib/lecture-photos-profils";
import { clientSession } from "@/lib/supabase/serveur";

type Participant = {
  nom_affiche: string;
  accompagnants: number;
  photo_chemin: string | null;
};

/** La liste des inscrits, par leur pseudo et leur photo : réservée aux comptes qui consultent la résidence. */
export async function Participants({ identifiant }: { identifiant: string }) {
  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("participants_activite", {
    identifiant,
  });
  if (error) throw new Error(`Participants illisibles : ${error.message}`);

  const participants = (data ?? []) as Participant[];
  if (participants.length === 0) return null;
  const photos = await adressesPhotosProfils(
    participants.map((participant) => participant.photo_chemin),
  );

  return (
    <ul aria-label="Participants" className="flex flex-col gap-space-sm">
      {participants.map((participant, rang) => (
        // Deux voisins peuvent porter le même pseudo : le rang distingue leurs lignes.
        <li key={rang} className="flex items-center gap-space-sm">
          <Avatar
            initiale={participant.nom_affiche.charAt(0).toUpperCase()}
            photo={
              (participant.photo_chemin &&
                photos.get(participant.photo_chemin)) ||
              undefined
            }
          />
          <p className="text-body-lg text-on-surface">
            {participant.nom_affiche}
            {libelleAccompagnants(participant.accompagnants) && (
              <span className="text-on-surface-variant">
                {" "}
                · {libelleAccompagnants(participant.accompagnants)}
              </span>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
