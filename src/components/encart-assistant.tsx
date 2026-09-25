import type { AvisAssistant } from "@/assistant";
import { EncartPastel } from "./encart-pastel";
import { Icone } from "./icone";

type Props = { avis: AvisAssistant | null };

/**
 * L'encart « Conseils de l'assistant » du récapitulatif : ce que renvoie le module assistant.
 * Tant qu'aucun moteur n'y est branché, il le dit en clair plutôt que de rester vide.
 */
export function EncartAssistant({ avis }: Props) {
  const conseils = avis
    ? [
        ...avis.avertissements.map((a) => a.message),
        ...(avis.moderation.avis === "a_relire"
          ? [avis.moderation.raison]
          : []),
      ]
    : [];

  return (
    <EncartPastel titre="Conseils de l'assistant">
      {conseils.length > 0 ? (
        <ul className="flex flex-col gap-space-xs">
          {conseils.map((conseil) => (
            <li key={conseil} className="flex items-start gap-space-xs">
              <Icone nom="lightbulb" taille={22} />
              {conseil}
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {avis
            ? "Rien à signaler : votre proposition est prête à être publiée."
            : "L'assistant relit votre proposition…"}
        </p>
      )}
    </EncartPastel>
  );
}
