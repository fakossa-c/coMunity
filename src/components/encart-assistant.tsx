import type { AvisAssistant } from "@/assistant";
import { EncartPastel } from "./encart-pastel";
import { Icone } from "./icone";

type Props = {
  avis: AvisAssistant | null;
  /**
   * Vrai sur la page unique tant qu'il manque le titre, la date, l'heure ou le lieu : sans conseil,
   * l'encart n'affirme pas que la proposition est prête, il dit ce qu'il attend.
   */
  incomplete?: boolean;
};

/**
 * L'encart « Conseils de l'assistant » : en haut du récapitulatif du mobile et de la page unique de
 * l'ordinateur, ce que renvoie le module assistant. Un point bloquant se dit comme tel, visible
 * sans défiler, avant la publication ; sans rien à signaler, l'encart le dit en clair plutôt que
 * de rester vide.
 */
export function EncartAssistant({ avis, incomplete = false }: Props) {
  const conseils = avis
    ? [
        ...avis.avertissements,
        ...(avis.moderation.avis === "a_relire"
          ? [
              {
                message:
                  "Votre activité sera relue par le conseil syndical avant d'être visible de vos voisins.",
                bloquant: false,
              },
            ]
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
                  <strong className="font-headline">À corriger : </strong>
                )}
                {message}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {!avis
            ? "L'assistant relit votre proposition…"
            : incomplete
              ? "Rien à signaler pour l'instant. L'assistant relira votre proposition quand le titre, la date, l'heure et le lieu seront remplis."
              : "Rien à signaler : votre proposition est prête à être publiée."}
        </p>
      )}
    </EncartPastel>
  );
}
