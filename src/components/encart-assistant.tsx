import type { AvisAssistant } from "@/assistant";
import { EncartPastel } from "./encart-pastel";
import { Icone } from "./icone";

type Props = { avis: AvisAssistant | null };

/**
 * L'encart « Conseils de l'assistant » du récapitulatif : ce que renvoie le module assistant.
 * Un point bloquant se dit comme tel, avant la publication ; sans rien à signaler, l'encart le
 * dit en clair plutôt que de rester vide.
 */
export function EncartAssistant({ avis }: Props) {
  const conseils = avis
    ? [
        ...avis.avertissements,
        ...(avis.moderation.avis === "a_relire"
          ? [{ message: avis.moderation.raison, bloquant: false }]
          : []),
      ]
    : [];

  return (
    <EncartPastel titre="Conseils de l'assistant">
      {conseils.length > 0 ? (
        <ul className="flex flex-col gap-space-xs">
          {conseils.map(({ message, bloquant }) => (
            <li key={message} className="flex items-start gap-space-xs">
              <Icone nom={bloquant ? "block" : "lightbulb"} taille={22} />
              <span>
                {bloquant && (
                  <strong className="font-headline">À corriger : </strong>
                )}
                {message}
              </span>
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
