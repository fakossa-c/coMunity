"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  installer,
  lireAideAffichee,
  masquer,
  sAbonner,
} from "@/lib/installation";
import { Icone } from "./icone";

/**
 * Bandeau de l'accueil qui aide à installer l'app, en navigation mobile uniquement : fixé au bas
 * de l'écran, juste au-dessus de la barre du bas, il arrive par-dessus la page sans rien déplacer.
 * Android : le bouton ouvre l'invite du navigateur. iPhone : les deux gestes de Safari.
 * Masqué d'un geste, il ne revient plus ; il n'apparaît jamais dans l'app installée.
 * Se place en fin de contenu : sa réserve y prolonge la page, pour que la dernière carte défile
 * jusqu'au-dessus de lui.
 */
export function AideInstallation() {
  const affichage = useSyncExternalStore(
    sAbonner,
    lireAideAffichee,
    () => null,
  );
  const [hauteur, setHauteur] = useState(0);
  // La hauteur du bandeau suit ses textes (grands caractères, variante) : la réserve la reprend.
  const suivreHauteur = useCallback((bandeau: HTMLElement | null) => {
    if (!bandeau) return;
    const observateur = new ResizeObserver(() =>
      setHauteur(bandeau.offsetHeight),
    );
    observateur.observe(bandeau);
    return () => observateur.disconnect();
  }, []);
  if (!affichage) return null;

  function fermer() {
    masquer();
    rendreFocusAuContenu();
  }

  async function installerApp() {
    if (await installer()) rendreFocusAuContenu();
  }

  return (
    <>
      <div aria-hidden="true" style={{ height: hauteur }} />
      <section
        ref={suivreHauteur}
        aria-labelledby="aide-installation-titre"
        className="fixed inset-x-[12px] bottom-[calc(var(--spacing-barre-nav)+12px+env(safe-area-inset-bottom))] z-40 flex items-center gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest py-space-sm pl-space-sm shadow-flottant desktop:bottom-[calc(20px+env(safe-area-inset-bottom))] desktop:mx-auto desktop:max-w-xl"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
          <Icone nom="install_mobile" taille={24} />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="aide-installation-titre"
            className="font-headline text-body-bold text-on-surface"
          >
            Installer l&apos;application
          </h2>
          {affichage === "android" ? (
            <p className="text-body-md text-on-surface-variant">
              Retrouvez la résidence en un geste.
            </p>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              Touchez <strong className="text-on-surface">Partager</strong>
              <Icone
                nom="ios_share"
                className="mx-0.5 inline size-5 align-text-bottom text-primary"
              />
              , puis{" "}
              <strong className="text-on-surface">
                Sur l&apos;écran d&apos;accueil
              </strong>
              .
            </p>
          )}
        </div>
        {affichage === "android" && (
          <button
            type="button"
            onClick={installerApp}
            className="inline-flex min-h-cible shrink-0 items-center rounded-full bg-fond-action px-4 font-headline text-label-lg text-texte-action hover:bg-primary-fixed-dim active:translate-y-0.5"
          >
            Installer<span className="sr-only"> l&apos;application</span>
          </button>
        )}
        <button
          type="button"
          onClick={fermer}
          aria-label="Masquer l'aide à l'installation"
          className="flex size-[52px] shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container"
        >
          <Icone nom="close" className="size-6" />
        </button>
      </section>
    </>
  );
}

/** Le bouton disparaît avec l'encart : le focus revient au contenu plutôt qu'en haut de page. */
function rendreFocusAuContenu() {
  document.getElementById("contenu")?.focus();
}
