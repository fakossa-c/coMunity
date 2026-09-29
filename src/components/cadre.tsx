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

const ESPACE_SYNDIC: Rubrique = {
  href: "/syndic",
  icone: "shield_person",
  titre: "Espace syndic",
  detail: "Résidents et membres du syndic",
};

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
  const rubriques = bloque
    ? []
    : estSyndicActif(session)
      ? [...RUBRIQUES, ESPACE_SYNDIC]
      : RUBRIQUES;
  return <MenuProfil {...identite(session)} rubriques={rubriques} />;
}

/**
 * Barre du haut du cadre Journal (ordinateur) : logo, onglets, « Proposer » et compte. Les
 * écrans de connexion n'ont que le logo ; un compte refusé ou retiré n'a ni onglets ni « Proposer ».
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
          <BarreNavigation actif={onglet} emplacement="haut" />
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
  const residence = await lireResidence();

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
          <BarreNavigation actif={onglet} emplacement="bas" />
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
  retour: { href: string; libelle: string };
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
            libelle={retour.libelle}
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
        libelle={retour.libelle}
        partager={partageable}
      />
      <GardeCompte completionExigee={completionExigee}>{children}</GardeCompte>
    </Ecran>
  );
}
