import { useEffect, useState } from "react";

/**
 * « Retour » (et tout lien interne de la page) demande confirmation quand `saisieEnCours` : le lien
 * cliqué est mis en attente et la saisie reste à l'écran jusqu'à la réponse. Rend la destination en
 * attente, ou `null`, et de quoi la lâcher (« Continuer la saisie »). Les liens qui ouvrent un autre onglet,
 * se téléchargent, mènent hors du site ou vers un point de la même page ne sont pas retenus.
 */
export function useConfirmationDeSortie(saisieEnCours: boolean) {
  const [sortie, setSortie] = useState<string | null>(null);

  useEffect(() => {
    if (!saisieEnCours) return;
    function surClic(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const lien = (e.target as Element).closest("a[href]");
      if (!(lien instanceof HTMLAnchorElement)) return;
      if (lien.target === "_blank" || lien.hasAttribute("download")) return;
      const url = new URL(lien.href, window.location.href);
      const ici = window.location;
      if (
        url.origin !== ici.origin ||
        (url.pathname === ici.pathname && url.search === ici.search)
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setSortie(url.pathname + url.search + url.hash);
    }
    // En capture : avant le lien de Next, qui ne navigue plus une fois l'événement annulé.
    document.addEventListener("click", surClic, true);
    return () => document.removeEventListener("click", surClic, true);
  }, [saisieEnCours]);

  return [sortie, setSortie] as const;
}

/**
 * Après un « Publier l'activité » refusé, la page défile jusqu'au champ à corriger : il peut être
 * loin de la colonne de droite où l'on a cliqué. `erreur` change à chaque verdict.
 */
export function useDefilementVersLErreur(
  actif: boolean,
  erreur: { champ?: string },
) {
  useEffect(() => {
    if (!actif || !erreur.champ) return;
    const champ = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    const cible =
      champ ?? document.querySelector<HTMLElement>("main [role='alert']");
    champ?.focus({ preventScroll: true });
    cible?.scrollIntoView({ block: "center" });
  }, [actif, erreur]);
}
