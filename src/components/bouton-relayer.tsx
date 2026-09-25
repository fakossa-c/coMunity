import { lienWhatsApp } from "@/lib/partage-activite";
import { classesBouton, type VarianteBouton } from "./bouton";
import { Icone } from "./icone";

type Props = {
  /** Le texte pré-rempli dans WhatsApp. */
  message: string;
  /** contour sur la fiche · action sur l'écran qui suit la publication, où c'est l'action principale */
  variante?: Extract<VarianteBouton, "action" | "contour">;
};

/** « Relayer sur le groupe WhatsApp » : ouvre WhatsApp avec le message déjà écrit. */
export function BoutonRelayer({ message, variante = "contour" }: Props) {
  return (
    <a
      href={lienWhatsApp(message)}
      target="_blank"
      rel="noopener noreferrer"
      className={classesBouton(variante)}
    >
      <Icone nom="forum" />
      Relayer sur le groupe WhatsApp
    </a>
  );
}
