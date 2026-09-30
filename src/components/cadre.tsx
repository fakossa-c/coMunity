import Link from "next/link";
import type { ReactNode } from "react";
import { identite } from "@/lib/identite";
import { lireResidence } from "@/lib/residence";
import {
  estSyndicActif,
  estSyndicRetire,
  lireSession,
  statutResident,
} from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";
import { BarreHaute } from "./barre-haute";
import { BarreNavigation, type IdOnglet } from "./barre-navigation";
import { BarreRetour, LienRetour } from "./barre-retour";
import { classesBouton } from "./bouton";
import { Ecran } from "./ecran";
import { EnTeteResidence } from "./en-tete-residence";
import { GardeCompte, SiCompteOuvert } from "./garde-compte";
import { Icone } from "./icone";
import { LienProposer } from "./lien-proposer";
import { MenuProfil, type Rubrique } from "./menu-profil";
import {
  MenuSyndic,
  TiroirSyndic,
  type CompteursSyndic,
  type IdRubriqueSyndic,
} from "./menu-syndic";

const RUBRIQUES: Rubrique[] = [
  {
    href: "/profil",
    icone: "person",
    titre: "Profil",
    detail: "Identifiants, informations, réglages",
  },
  {
    href: "/mon-syndic",
    icone: "support_agent",
    titre: "Mon syndic",
    detail: "Contacts et demandes",
  },
  {
    href: "/ma-copro",
    icone: "apartment",
    titre: "Ma copro",
    detail: "Espaces, biens communs et règlement",
  },
];

/**
 * Avatar qui ouvre le menu du profil, ou « Se connecter » pour un visiteur. `compact` : sans
 * pictogramme, quand « Partager » occupe déjà la barre.
 */
async function Compte({ compact = false }: { compact?: boolean }) {
  const session = await lireSession();

  if (!session) {
    return (
      <Link
        href="/connexion"
        className={`${classesBouton("contour")} shrink-0 whitespace-nowrap ${compact ? "px-3!" : "px-4"}`}
      >
        {!compact && <Icone nom="login" taille={24} />}
        Se connecter
      </Link>
    );
  }

  // Un compte refusé ou retiré, résident ou membre du conseil syndical, ne garde que la déconnexion.
  const statut = statutResident(session);
  const bloque =
    statut === "refuse" || statut === "retire" || estSyndicRetire(session);
  return (
    <MenuProfil {...identite(session)} rubriques={bloque ? [] : RUBRIQUES} />
  );
}

/**
 * Barre du haut du cadre Journal (ordinateur) : logo, onglets, « Proposer » et compte. Les
 * écrans de connexion n'ont que le logo ; un compte refusé ou retiré n'a ni onglets ni « Proposer ».
 * Un membre actif du conseil syndical a l'onglet « Tableau de bord ».
 */
async function BarreDuHaut({
  onglet,
  avecCompte = true,
}: {
  onglet?: IdOnglet;
  avecCompte?: boolean;
}) {
  if (!avecCompte) return <BarreHaute />;
  const session = await lireSession();
  return (
    <BarreHaute
      navigation={
        <SiCompteOuvert>
          <BarreNavigation
            actif={onglet}
            emplacement="haut"
            syndic={estSyndicActif(session)}
          />
        </SiCompteOuvert>
      }
      actions={
        <>
          {session && (
            <SiCompteOuvert>
              <LienProposer />
            </SiCompteOuvert>
          )}
          <Compte />
        </>
      }
    />
  );
}

type PropsPrincipal = {
  onglet: IdOnglet;
  /** BoutonFlottant de l'écran, masqué comme la barre du bas pour un compte bloqué. */
  flottant?: ReactNode;
  children: ReactNode;
};

/**
 * Écran principal (Accueil, Activités, Annonces) : sur mobile, l'en-tête de résidence et la barre
 * du bas ; sur ordinateur, la barre du haut du cadre Journal, qui porte les onglets.
 */
export async function EcranPrincipal({
  onglet,
  flottant,
  children,
}: PropsPrincipal) {
  const [residence, session] = await Promise.all([
    lireResidence(),
    lireSession(),
  ]);

  return (
    <Ecran
      haut={
        <>
          <BarreDuHaut onglet={onglet} />
          <EnTeteResidence
            residence={residence?.nom ?? "Notre résidence"}
            compte={<Compte />}
          />
        </>
      }
      barreBas={
        <SiCompteOuvert>
          <BarreNavigation
            actif={onglet}
            emplacement="bas"
            syndic={estSyndicActif(session)}
          />
        </SiCompteOuvert>
      }
      // Sur ordinateur, les onglets sont dans la barre du haut : plus de barre du bas à dégager.
      paddingBas={180}
      paddingBasBureau={40}
      flottant={flottant && <SiCompteOuvert>{flottant}</SiCompteOuvert>}
    >
      <GardeCompte>{children}</GardeCompte>
    </Ecran>
  );
}

type PropsSecondaire = {
  retour: { href: string; destination: string };
  /** Faux sur les écrans de connexion, où l'avatar n'a pas lieu d'être. */
  avecCompte?: boolean;
  /** Bouton « Partager » d'une fiche, dans la barre de retour. */
  partager?: ReactNode;
  /** BarreActionFixe de l'écran. */
  action?: ReactNode;
  /**
   * Vrai quand le formulaire du contenu porte lui-même sa BarreActionFixe, pour que son bouton
   * d'envoi suive l'envoi en cours : l'écran lui réserve alors la place en bas.
   */
  actionDansLeFormulaire?: boolean;
  /** Faux sur les écrans où un membre du conseil syndical saisit son prénom et son nom. */
  completionExigee?: boolean;
  children: ReactNode;
};

/**
 * Écran secondaire : sur mobile, barre de retour collante ; sur ordinateur, la barre du haut du
 * cadre Journal et un lien de retour en tête du contenu. Barre d'action fixe s'il y en a une.
 */
export function EcranSecondaire({
  retour,
  avecCompte = true,
  partager,
  action,
  actionDansLeFormulaire = false,
  completionExigee,
  children,
}: PropsSecondaire) {
  const partageable = partager && <SiCompteOuvert>{partager}</SiCompteOuvert>;
  return (
    <Ecran
      haut={
        <>
          <BarreRetour
            href={retour.href}
            destination={retour.destination}
            partager={partageable}
            compte={avecCompte && <Compte compact={Boolean(partager)} />}
          />
          <BarreDuHaut avecCompte={avecCompte} />
        </>
      }
      barreBas={action && <SiCompteOuvert>{action}</SiCompteOuvert>}
      paddingBas={action || actionDansLeFormulaire ? 170 : 40}
    >
      <LienRetour
        href={retour.href}
        destination={retour.destination}
        partager={partageable}
      />
      <GardeCompte completionExigee={completionExigee}>{children}</GardeCompte>
    </Ecran>
  );
}

/** Comptes qui attendent leur validation et activités à relire : les pastilles du menu de l'espace syndic. */
async function lireCompteursSyndic(): Promise<CompteursSyndic> {
  const supabase = await clientSession();
  const [residents, moderation] = await Promise.all([
    supabase
      .from("profil")
      .select("id", { count: "exact", head: true })
      .eq("role", "resident")
      .eq("statut", "en_attente"),
    supabase
      .from("activite")
      .select("id", { count: "exact", head: true })
      .eq("statut", "en_relecture"),
  ]);
  return {
    residents: residents.count ?? 0,
    moderation: moderation.count ?? 0,
  };
}

type PropsSyndic = {
  /** Rubrique marquée courante dans le menu ; sur un formulaire, celle de sa liste. */
  rubrique: IdRubriqueSyndic;
  /** Formulaire : « Retour » vers sa liste. Sur mobile, il reste un écran secondaire. */
  retour?: { href: string; destination: string };
  /** Comme pour `EcranSecondaire` : le formulaire porte sa BarreActionFixe, l'écran lui fait place. */
  actionDansLeFormulaire?: boolean;
  children: ReactNode;
};

/**
 * Écran de l'espace syndic, pour un membre actif du conseil syndical (chaque page contrôle
 * l'accès avant de le poser ; un refus garde `EcranSecondaire`, sans menu). Sur ordinateur, la
 * barre du haut avec l'onglet « Tableau de bord » actif et `MenuSyndic` à gauche ; « Retour » en
 * tête d'un formulaire. Sur mobile, une liste a l'en-tête de résidence, le bouton du tiroir
 * `TiroirSyndic` et la barre du bas avec « Syndic » actif ; un formulaire garde sa barre de retour.
 * Les compteurs du menu sont lus une fois par page.
 */
export async function EcranSyndic({
  rubrique,
  retour,
  actionDansLeFormulaire = false,
  children,
}: PropsSyndic) {
  const compteurs = await lireCompteursSyndic();
  const menu = <MenuSyndic actif={rubrique} compteurs={compteurs} />;

  if (retour) {
    return (
      <Ecran
        haut={
          <>
            <BarreRetour
              href={retour.href}
              destination={retour.destination}
              compte={<Compte />}
            />
            <BarreDuHaut onglet="syndic" />
          </>
        }
        menu={menu}
        paddingBas={actionDansLeFormulaire ? 170 : 40}
      >
        <LienRetour href={retour.href} destination={retour.destination} />
        <GardeCompte>{children}</GardeCompte>
      </Ecran>
    );
  }

  const residence = await lireResidence();
  return (
    <Ecran
      haut={
        <>
          <BarreDuHaut onglet="syndic" />
          <EnTeteResidence
            residence={residence?.nom ?? "Notre résidence"}
            compte={<Compte />}
          />
        </>
      }
      menu={menu}
      barreBas={<BarreNavigation actif="syndic" emplacement="bas" syndic />}
      paddingBas={180}
      paddingBasBureau={40}
    >
      <TiroirSyndic actif={rubrique} compteurs={compteurs} />
      <GardeCompte>{children}</GardeCompte>
    </Ecran>
  );
}
