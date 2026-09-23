"use client";

import { useSyncExternalStore } from "react";
import { Icone } from "./icone";

/** Événement de Chrome quand l'app devient installable, absent des types du DOM. */
type InviteInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Affichage = "iphone" | "android" | null;

const CLE_MASQUEE = "aide-installation-masquee";

// État partagé hors de React : l'invite de Chrome peut arriver avant l'affichage de l'encart.
let invite: InviteInstallation | null = null;
// Repli quand le stockage du navigateur est indisponible (navigation privée) : masquée jusqu'au rechargement.
let masqueeEnMemoire = false;
const abonnes = new Set<() => void>();

function prevenir() {
  for (const rappel of abonnes) rappel();
}

function sAbonner(rappel: () => void) {
  abonnes.add(rappel);
  return () => {
    abonnes.delete(rappel);
  };
}

function estMasquee() {
  if (masqueeEnMemoire) return true;
  try {
    return localStorage.getItem(CLE_MASQUEE) === "1";
  } catch {
    return false;
  }
}

function masquer() {
  masqueeEnMemoire = true;
  try {
    localStorage.setItem(CLE_MASQUEE, "1");
  } catch {
    // Le repli en mémoire suffit pour cette visite.
  }
  prevenir();
}

function estInstallee() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const estAndroid = () => /Android/i.test(navigator.userAgent);
const estIPhone = () => /iPhone|iPod/i.test(navigator.userAgent);

function lireAffichage(): Affichage {
  if (estMasquee() || estInstallee()) return null;
  if (estIPhone()) return "iphone";
  if (invite && estAndroid()) return "android";
  return null;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evenement) => {
    // Encart masqué ou ordinateur : le navigateur propose l'installation à sa façon.
    if (estMasquee() || !estAndroid()) return;
    evenement.preventDefault();
    invite = evenement as InviteInstallation;
    prevenir();
  });
  window.addEventListener("appinstalled", () => {
    invite = null;
    masquer();
  });
}

async function installer() {
  const courante = invite;
  if (!courante) return;
  // Chrome n'accepte qu'un appel à `prompt()` par invite.
  invite = null;
  await courante.prompt();
  const { outcome } = await courante.userChoice;
  if (outcome === "accepted") masquer();
  else prevenir();
}

/**
 * Encart de l'accueil qui aide à installer l'app, en navigation mobile uniquement.
 * Android : le bouton ouvre l'invite du navigateur. iPhone : les deux gestes de Safari.
 * Masqué d'un geste, il ne revient plus ; il n'apparaît jamais dans l'app installée.
 */
export function AideInstallation() {
  const affichage = useSyncExternalStore(sAbonner, lireAffichage, () => null);
  if (!affichage) return null;

  function fermer() {
    masquer();
    // Le bouton disparaît avec l'encart : le focus revient au contenu plutôt qu'en haut de page.
    document.getElementById("contenu")?.focus();
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
            <p className="mt-1 text-body-md text-on-surface-variant">
              Retrouvez la résidence sur l&apos;écran d&apos;accueil de votre
              téléphone, comme une application.
            </p>
            <button
              type="button"
              onClick={installer}
              className="mt-space-sm min-h-[52px] rounded-lg bg-inverse-surface px-space-md font-headline text-label-lg text-inverse-on-surface active:translate-y-[2px]"
            >
              Installer l&apos;app
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Ajoutez-la à l&apos;écran d&apos;accueil de votre iPhone :
            </p>
            <ol className="mt-space-xs flex flex-col gap-space-xs text-body-md text-on-surface">
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
