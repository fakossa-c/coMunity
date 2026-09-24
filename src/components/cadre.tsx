import Link from "next/link";
import type { ReactNode } from "react";
import { identite } from "@/lib/identite";
import { lireResidence } from "@/lib/residence";
import { estSyndicActif, lireSession, statutResident } from "@/lib/session";
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

/** Avatar qui ouvre le menu du profil, ou « Se connecter » pour un visiteur. */
async function Compte() {
  const session = await lireSession();

  if (!session) {
    return (
      <Link
        href="/connexion"
        className={`${classesBouton("contour")} shrink-0 px-4 whitespace-nowrap`}
      >
        <Icone nom="login" taille={24} />
        Se connecter
      </Link>
    );
  }

  const statut = statutResident(session);
  const bloque = statut === "refuse" || statut === "retire";
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
  /** BarreActionFixe de l'écran. */
  action?: ReactNode;
  children: ReactNode;
};

/** Écran secondaire : barre de retour collante, barre d'action fixe s'il y en a une. */
export function EcranSecondaire({
  retour,
  avecCompte = true,
  action,
  children,
}: PropsSecondaire) {
  return (
    <Ecran
      haut={
        <BarreRetour
          href={retour.href}
          libelle={retour.libelle}
          compte={avecCompte && <Compte />}
        />
      }
      barreBas={action}
      paddingBas={action ? 170 : 40}
    >
      <GardeCompte>{children}</GardeCompte>
    </Ecran>
  );
}
