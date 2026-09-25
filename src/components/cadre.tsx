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
import { BarreNavigation, type IdOnglet } from "./barre-navigation";
import { BarreRetour } from "./barre-retour";
import { classesBouton } from "./bouton";
import { Ecran } from "./ecran";
import { EnTeteResidence } from "./en-tete-residence";
import { GardeCompte, SiCompteOuvert } from "./garde-compte";
import { Icone } from "./icone";
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
    detail: "Résidence, conseil syndical, documents",
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

type PropsPrincipal = {
  onglet: IdOnglet;
  /** BoutonFlottant de l'écran, masqué comme la barre du bas pour un compte bloqué. */
  flottant?: ReactNode;
  children: ReactNode;
};

/** Écran principal (Accueil, Activités, Annonces) : en-tête de résidence et barre du bas. */
export async function EcranPrincipal({
  onglet,
  flottant,
  children,
}: PropsPrincipal) {
  const residence = await lireResidence();

  return (
    <Ecran
      haut={
        <EnTeteResidence
          residence={residence?.nom ?? "Notre résidence"}
          compte={<Compte />}
        />
      }
      barreBas={
        <SiCompteOuvert>
          <BarreNavigation actif={onglet} />
        </SiCompteOuvert>
      }
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

/** Écran secondaire : barre de retour collante, barre d'action fixe s'il y en a une. */
export function EcranSecondaire({
  retour,
  avecCompte = true,
  partager,
  action,
  actionDansLeFormulaire = false,
  completionExigee,
  children,
}: PropsSecondaire) {
  return (
    <Ecran
      haut={
        <BarreRetour
          href={retour.href}
          libelle={retour.libelle}
          partager={partager && <SiCompteOuvert>{partager}</SiCompteOuvert>}
          compte={avecCompte && <Compte compact={Boolean(partager)} />}
        />
      }
      barreBas={action && <SiCompteOuvert>{action}</SiCompteOuvert>}
      paddingBas={action || actionDansLeFormulaire ? 170 : 40}
    >
      <GardeCompte completionExigee={completionExigee}>{children}</GardeCompte>
    </Ecran>
  );
}
