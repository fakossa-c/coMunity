import { BarreHaute } from "./barre-haute";
import { BarreRetour, LienRetour } from "./barre-retour";
import { Bouton } from "./bouton";
import { Ecran } from "./ecran";
import { TitrePage } from "./titre-page";

const RETOUR = { href: "/", destination: "Accueil" };

/**
 * Écran d'une page dont une lecture a échoué (`error.tsx`, `global-error.tsx`), présenté comme
 * la page introuvable : « Retour » vers l'Accueil, et « Réessayer », qui relance la lecture. Rendu
 * dans le navigateur, il n'a ni avatar ni onglets, qui se lisent sur le serveur.
 */
export function EcranErreur({ reessayer }: { reessayer: () => void }) {
  return (
    <Ecran
      haut={
        <>
          <BarreRetour {...RETOUR} />
          <BarreHaute />
        </>
      }
    >
      <title>Page indisponible · coMunity</title>
      <LienRetour {...RETOUR} />
      <TitrePage
        titre="Page indisponible"
        sousTitre="Un souci de notre côté. Réessayez dans un instant."
      />
      <Bouton onClick={reessayer}>Réessayer</Bouton>
    </Ecran>
  );
}
