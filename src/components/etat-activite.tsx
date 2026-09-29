import {
  etatConfirmation,
  libelleConfirmation,
} from "@/lib/inscription-activite";
import { Etiquette } from "./etiquette";

/**
 * Ce que la base dit de l'état d'une activité : publiée, annulée par son créateur, ou mise à part
 * par la modération (en relecture, masquée : seuls son créateur et le conseil syndical la voient).
 */
export type StatutActivite = "publiee" | "annulee" | "en_relecture" | "masquee";

type Props = {
  statut: StatutActivite;
  /** `null` : pas de minimum de participants. */
  capaciteMin: number | null;
  /** Accompagnants compris. */
  placesPrises: number;
  /** Une activité passée n'a plus de minimum à confirmer ; son annulation reste dite. */
  passee: boolean;
};

/**
 * L'état d'une activité, en pastille : « Annulée » ou « Masquée » (rouge pâle), « En relecture »
 * (abricot), sinon « Confirmée » (vert) ou
 * « Encore N participants pour confirmer » (abricot) selon le minimum. Rien sans minimum, ni une
 * fois l'activité passée. La pastille ne s'étire pas dans une colonne.
 */
export function EtatActivite({
  statut,
  capaciteMin,
  placesPrises,
  passee,
}: Props) {
  if (statut === "en_relecture") {
    return (
      <div>
        <Etiquette ton="abricot" icone="hourglass_top">
          En relecture
        </Etiquette>
      </div>
    );
  }

  if (statut === "masquee") {
    return (
      <div>
        <Etiquette ton="erreur" icone="visibility_off">
          Masquée
        </Etiquette>
      </div>
    );
  }

  if (statut === "annulee") {
    return (
      <div>
        <Etiquette ton="erreur" icone="event_busy">
          Annulée
        </Etiquette>
      </div>
    );
  }

  const etat = passee ? null : etatConfirmation({ capaciteMin, placesPrises });
  const libelle = libelleConfirmation(etat);
  if (!etat || !libelle) return null;

  return (
    <div>
      {etat.confirmee ? (
        <Etiquette ton="vert" icone="event_available">
          {libelle}
        </Etiquette>
      ) : (
        <Etiquette ton="abricot" icone="hourglass_top">
          {libelle}
        </Etiquette>
      )}
    </div>
  );
}
