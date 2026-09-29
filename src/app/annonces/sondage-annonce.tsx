import { Sondage } from "@/components/sondage";
import type { SondageLu } from "@/lib/lecture-annonces";
import { affichageSondage, libelleEcheance } from "@/lib/sondages";
import { repondreSondage } from "./actions-sondage";

/** Le sondage d'une annonce, tel que la personne connectée le voit : voter, lire ou les résultats. */
export function SondageAnnonce({
  lu,
  peutRepondre,
}: {
  lu: SondageLu;
  peutRepondre: boolean;
}) {
  const { sondage, choix, votes } = lu;
  return (
    <Sondage
      question={sondage.question}
      options={sondage.options}
      echeance={libelleEcheance(sondage.echeance)}
      affichage={affichageSondage({ sondage, choix, votes, peutRepondre })}
      onVoter={repondreSondage.bind(null, sondage.id)}
    />
  );
}
