import { useSyncExternalStore } from "react";

/** Le point de rupture ordinateur du design system (`--breakpoint-desktop`, 64 rem). */
const REQUETE_BUREAU = "(min-width: 64rem)";

function suivre(rappel: () => void) {
  const requete = window.matchMedia(REQUETE_BUREAU);
  requete.addEventListener("change", rappel);
  return () => requete.removeEventListener("change", rappel);
}

/**
 * Vrai en largeur ordinateur. La mise en page se règle en CSS (`desktop:`) ; ce hook ne sert qu'à
 * ce que la page unique fasse en plus de son côté : l'assistant qui relit en continu, la
 * confirmation en quittant. Faux au rendu serveur et à l'hydratation, pour que rien ne change de
 * place au chargement.
 */
export function useBureau() {
  return useSyncExternalStore(
    suivre,
    () => window.matchMedia(REQUETE_BUREAU).matches,
    () => false,
  );
}
