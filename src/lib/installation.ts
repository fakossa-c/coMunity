/**
 * État de l'aide à l'installation, tenu hors de React : Chrome émet son invite une seule
 * fois par chargement, parfois avant l'affichage de l'accueil. Ce module doit donc être
 * chargé sur toutes les pages (voir `EcouteInstallation`, dans le layout).
 */

/** Événement de Chrome quand l'app devient installable, absent des types du DOM. */
type InviteInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type AideAffichee = "iphone" | "android" | null;

const CLE_MASQUEE = "aide-installation-masquee";

let invite: InviteInstallation | null = null;
// Repli quand le stockage du navigateur est indisponible (navigation privée) : masquée jusqu'au rechargement.
let masqueeEnMemoire = false;
const abonnes = new Set<() => void>();

function notifierAbonnes() {
  for (const rappel of abonnes) rappel();
}

export function sAbonner(rappel: () => void) {
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

export function masquer() {
  masqueeEnMemoire = true;
  try {
    localStorage.setItem(CLE_MASQUEE, "1");
  } catch {
    // Le repli en mémoire suffit pour cette visite.
  }
  notifierAbonnes();
}

function estInstallee() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const estAndroid = () => /Android/i.test(navigator.userAgent);
// Les navigateurs intégrés aux applis (Facebook, Instagram, Line) n'offrent pas « Sur l'écran d'accueil ».
const estIPhone = () =>
  /iPhone|iPod/i.test(navigator.userAgent) &&
  !/FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent);

/** Variante de l'encart à montrer, ou `null` quand il n'a rien à faire là. */
export function lireAideAffichee(): AideAffichee {
  if (estMasquee() || estInstallee()) return null;
  if (estIPhone()) return "iphone";
  if (invite && estAndroid()) return "android";
  return null;
}

/** Ouvre l'invite d'installation d'Android. Renvoie `true` si le résident a installé l'app. */
export async function installer(): Promise<boolean> {
  const courante = invite;
  if (!courante) return false;
  // Chrome n'accepte qu'un appel à `prompt()` par invite.
  invite = null;
  try {
    await courante.prompt();
    const { outcome } = await courante.userChoice;
    if (outcome === "accepted") {
      masquer();
      return true;
    }
  } catch (erreur) {
    console.error("Invite d'installation impossible :", erreur);
  }
  notifierAbonnes();
  return false;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (evenement) => {
    // Encart masqué ou ordinateur : le navigateur propose l'installation à sa façon.
    if (estMasquee() || !estAndroid()) return;
    evenement.preventDefault();
    invite = evenement as InviteInstallation;
    notifierAbonnes();
  });
  window.addEventListener("appinstalled", () => {
    invite = null;
    masquer();
  });
}
