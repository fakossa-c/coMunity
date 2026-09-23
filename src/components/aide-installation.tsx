"use client";

import { useSyncExternalStore } from "react";
import {
  installer,
  lireAideAffichee,
  masquer,
  sAbonner,
} from "@/lib/installation";
import { Icone } from "./icone";

/**
 * Encart de l'accueil qui aide à installer l'app, en navigation mobile uniquement.
 * Android : le bouton ouvre l'invite du navigateur. iPhone : les deux gestes de Safari.
 * Masqué d'un geste, il ne revient plus ; il n'apparaît jamais dans l'app installée.
 */
export function AideInstallation() {
  const affichage = useSyncExternalStore(
    sAbonner,
    lireAideAffichee,
    () => null,
  );
  if (!affichage) return null;

  function fermer() {
    masquer();
    rendreFocusAuContenu();
  }

  async function installerApp() {
    if (await installer()) rendreFocusAuContenu();
  }

  return (
    <section
      aria-labelledby="aide-installation-titre"
      className="mb-space-lg flex items-start gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)]"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
        <Icone nom="install_mobile" className="size-7" />
      </span>
      <div className="min-w-0 flex-1">
        <h2
          id="aide-installation-titre"
          className="pt-2.5 font-headline text-headline-sm text-on-surface"
        >
          Installer l&apos;app
        </h2>
        {affichage === "android" ? (
          <>
            <p className="mt-1 text-body-lg text-on-surface-variant">
              Retrouvez la résidence sur l&apos;écran d&apos;accueil de votre
              téléphone, comme une application.
            </p>
            <button
              type="button"
              onClick={installerApp}
              className="mt-space-sm min-h-14 rounded-lg border-[1.5px] border-border-distinct bg-inverse-surface px-space-md font-headline text-body-bold text-inverse-on-surface active:translate-y-[2px]"
            >
              Installer l&apos;app
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-body-lg text-on-surface-variant">
              Ajoutez-la à l&apos;écran d&apos;accueil de votre iPhone :
            </p>
            <ol className="mt-space-xs flex flex-col gap-space-xs text-body-lg text-on-surface">
              <li className="flex items-center gap-space-xs">
                <Icone
                  nom="ios_share"
                  className="size-6 shrink-0 text-primary"
                />
                <span>
                  1. Touchez <strong>Partager</strong>
                </span>
              </li>
              <li className="flex items-center gap-space-xs">
                <Icone nom="add_box" className="size-6 shrink-0 text-primary" />
                <span>
                  2. Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>
                </span>
              </li>
            </ol>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={fermer}
        aria-label="Masquer l'aide à l'installation"
        className="-mt-1 -mr-2 flex size-[52px] shrink-0 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container"
      >
        <Icone nom="close" className="size-6" />
      </button>
    </section>
  );
}

/** Le bouton disparaît avec l'encart : le focus revient au contenu plutôt qu'en haut de page. */
function rendreFocusAuContenu() {
  document.getElementById("contenu")?.focus();
}
