import {
  etatConfirmation,
  libelleConfirmation,
} from "@/lib/inscription-activite";
import { Etiquette } from "./etiquette";

/** Ce que la base dit de l'état d'une activité : publiée, ou annulée par son créateur. */
export type StatutActivite = "publiee" | "annulee";

type Props = {
  statut: StatutActivite;
  /** `null` : pas de minimum de participants. */
  capaciteMin: number | null;
  /** Accompagnants compris. */
  placesPrises: number;
};

/**
 * L'état d'une activité, en pastille : « Annulée » (rouge pâle), sinon « Confirmée » (vert) ou
 * « Encore N participants pour confirmer » (abricot) selon le minimum. Rien sans minimum.
 */
export function EtatActivite({ statut, capaciteMin, placesPrises }: Props) {
  if (statut === "annulee") {
    return (
      <Etiquette ton="erreur" icone="event_busy">
        Annulée
      </Etiquette>
    );
  }

  const etat = etatConfirmation({ capaciteMin, placesPrises });
  const libelle = libelleConfirmation(etat);
  if (!etat || !libelle) return null;

  return etat.confirmee ? (
    <Etiquette ton="vert" icone="event_available">
      {libelle}
    </Etiquette>
  ) : (
    <Etiquette ton="abricot" icone="hourglass_top">
      {libelle}
    </Etiquette>
  );
}
