import { Avatar } from "@/components/avatar";
import { libelleAccompagnants } from "@/lib/inscription-activite";
import { clientSession } from "@/lib/supabase/serveur";

type Participant = { nom_affiche: string; accompagnants: number };

/** La liste des inscrits, prénom et initiale du nom : réservée aux comptes qui consultent la résidence. */
export async function Participants({ identifiant }: { identifiant: string }) {
  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("participants_activite", {
    identifiant,
  });
  if (error) throw new Error(`Participants illisibles : ${error.message}`);

  const participants = (data ?? []) as Participant[];
  if (participants.length === 0) return null;

  return (
    <ul aria-label="Participants" className="flex flex-col gap-space-sm">
      {participants.map((participant) => (
        <li
          key={participant.nom_affiche}
          className="flex items-center gap-space-sm"
        >
          <Avatar initiale={participant.nom_affiche.charAt(0).toUpperCase()} />
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
