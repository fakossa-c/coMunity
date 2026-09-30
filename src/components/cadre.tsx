import Link from "next/link";
import type { ReactNode } from "react";
import { identite } from "@/lib/identite";
import { lireCompteursSyndic } from "@/lib/lecture-espace-syndic";
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
import { MenuSyndic, TiroirSyndic, type IdRubriqueSyndic } from "./menu-syndic";

const RUBRIQUES: Rubrique[] = [
  {
    href: "/profil",
    icone: "person",
    titre: "Profil",
    detail: "Compte, informations, réglages",
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
 * écrans de connexion n'ont que le logo (`EcranConnexion`) ; un compte refusé ou retiré n'a ni
 * onglets ni « Proposer ». Un membre actif du conseil syndical a l'onglet « Tableau de bord ».
 */
async function BarreDuHaut({ onglet }: { onglet?: IdOnglet }) {
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
  /** Bouton « Partager » d'une fiche, dans la barre de retour. */
  partager?: ReactNode;
  /** BarreActionFixe de l'écran. */
  action?: ReactNode;
  /**
   * Vrai quand le formulaire du contenu porte lui-même sa BarreActionFixe, pour que son bouton
   * d'envoi suive l'envoi en cours : l'écran lui réserve alors la place en bas.
   */
  actionDansLeFormulaire?: boolean;
  children: ReactNode;
};

/**
 * Écran secondaire : sur mobile, barre de retour collante ; sur ordinateur, la barre du haut du
 * cadre Journal et un lien de retour en tête du contenu. Barre d'action fixe s'il y en a une.
 */
export function EcranSecondaire({
  retour,
  partager,
  action,
  actionDansLeFormulaire = false,
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
            compte={<Compte compact={Boolean(partager)} />}
          />
          <BarreDuHaut />
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
      <GardeCompte>{children}</GardeCompte>
    </Ecran>
  );
}

type PropsConnexion = {
  retour: { href: string; destination: string };
  /**
   * Vrai pour une personne connectée : sur mobile, son avatar reste dans la barre de retour. Sur
   * ordinateur, la barre du haut n'a jamais que le logo.
   */
  avecCompte?: boolean;
  /** Faux sur les écrans où un membre du conseil syndical saisit son prénom et son nom. */
  completionExigee?: boolean;
  /** Ce qui suit la carte : l'encart « Pas encore de compte ? » de la connexion. */
  sousLaCarte?: ReactNode;
  children: ReactNode;
};

/**
 * Écran de connexion (connexion, inscription, mot de passe oublié, nouveau mot de passe,
 * « Présentez-vous à vos voisins »). Sur ordinateur, la barre du haut réduite au logo, même pour
 * une personne connectée, et le contenu dans une carte centrée de 544 px, « Retour » au-dessus ;
 * le titre y prend `headline-xl` au lieu du très grand titre. Sur mobile, c'est un écran
 * secondaire : barre de retour, contenu en colonne de 28 rem, sans carte.
 */
export function EcranConnexion({
  retour,
  avecCompte = false,
  completionExigee,
  sousLaCarte,
  children,
}: PropsConnexion) {
  return (
    <Ecran
      haut={
        <>
          <BarreRetour
            href={retour.href}
            destination={retour.destination}
            compte={avecCompte && <Compte />}
          />
          <BarreHaute />
        </>
      }
    >
      <div className="desktop:mx-auto desktop:max-w-[34rem]">
        <LienRetour href={retour.href} destination={retour.destination} />
        <div className="desktop:rounded-lg desktop:bg-fond-carte desktop:p-10 desktop:shadow-douce desktop:[--text-titre-journal--line-height:var(--text-headline-xl--line-height)] desktop:[--text-titre-journal:var(--text-headline-xl)]">
          <GardeCompte completionExigee={completionExigee}>
            <div className="max-w-md desktop:max-w-none">{children}</div>
          </GardeCompte>
        </div>
        {sousLaCarte && (
          <SiCompteOuvert>
            <div className="mt-space-lg max-w-md desktop:max-w-none">
              {sousLaCarte}
            </div>
          </SiCompteOuvert>
        )}
      </div>
    </Ecran>
  );
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
  const [compteurs, residence] = await Promise.all([
    lireCompteursSyndic(),
    lireResidence(),
  ]);
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
