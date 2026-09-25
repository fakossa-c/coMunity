"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Champ, ChampListe, ChampTexte } from "@/components/champ";
import { ChoixEtiquettes } from "@/components/choix-etiquettes";
import { ChoixSegmente } from "@/components/choix-segmente";
import { Annonce } from "@/components/formulaire";
import { TitreSection } from "@/components/titre-section";
import {
  categoriesActivite,
  categoriesActiviteListe,
  type CategorieActivite,
} from "@/lib/categories-activite";
import {
  LIMITES,
  NOMBRE_ETAPES,
  SAISIE_VIDE,
  TITRES_ETAPES,
  verifierEtape,
  versNouvelleActivite,
  type ChampSaisie,
  type Etape,
  type SaisieActivite,
} from "@/lib/proposition-activite";
import {
  erreurDuChamp,
  erreurGenerale,
  type ErreurFormulaire,
  type Resultat,
} from "@/lib/resultat";
import { cheminFiche } from "@/lib/partage-activite";
import { enregistrer, publier } from "./actions";
import { Recapitulatif } from "./recapitulatif";

type Erreur = ErreurFormulaire<ChampSaisie>;

type Props = {
  /** La saisie de départ : vide pour une nouvelle activité, pré-remplie pour modifier ou dupliquer. */
  initial?: SaisieActivite;
  /**
   * Présent quand on modifie une activité existante : le dernier écran enregistre au lieu de
   * publier, et la capacité ne peut pas descendre sous les `placesPrises` personnes inscrites.
   */
  modification?: { identifiant: string; placesPrises: number };
};

/**
 * Le parcours de création en 4 étapes : la saisie reste en mémoire d'une étape à l'autre. Il sert
 * aussi à modifier une activité (pré-rempli) et à en dupliquer une (pré-rempli sans la date).
 */
export function ParcoursProposition({
  initial = SAISIE_VIDE,
  modification,
}: Props) {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>(1);
  // Vrai après « Modifier » depuis le récapitulatif : « Continuer » y ramène directement.
  const [retourRecapitulatif, setRetourRecapitulatif] = useState(false);
  const [saisie, setSaisie] = useState<SaisieActivite>(initial);
  const [erreur, setErreur] = useState<Erreur>({});
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  const titreEtape = useRef<HTMLHeadingElement>(null);
  const premiereEtape = useRef(true);

  // À chaque changement d'étape, le titre de l'étape prend le focus : le lecteur d'écran
  // annonce où l'on est, la page revient en haut.
  useEffect(() => {
    if (premiereEtape.current) {
      premiereEtape.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    titreEtape.current?.focus();
  }, [etape]);

  function poser<C extends keyof SaisieActivite>(
    champ: C,
    valeur: SaisieActivite[C],
  ) {
    setSaisie((s) => ({ ...s, [champ]: valeur }));
  }

  function aller(cible: Etape) {
    setErreur({});
    setResultat(null);
    setEtape(cible);
    if (cible === NOMBRE_ETAPES) setRetourRecapitulatif(false);
  }

  function modifier(cible: Etape) {
    setRetourRecapitulatif(true);
    aller(cible);
  }

  function continuer() {
    const verdict = verifierEtape(etape, saisie, {
      placesPrises: modification?.placesPrises,
    });
    setErreur(verdict);
    if (verdict.erreur) return;
    aller(retourRecapitulatif ? NOMBRE_ETAPES : ((etape + 1) as Etape));
  }

  function publierMaintenant() {
    setResultat(null);
    // Publiée ou enregistrée, l'activité mène à son écran : seul un échec revient ici.
    demarrer(async () => {
      const activite = versNouvelleActivite(saisie);
      setResultat(
        modification
          ? await enregistrer(modification.identifiant, activite)
          : await publier(activite),
      );
    });
  }

  const erreurDe = (champ: ChampSaisie) => erreurDuChamp(erreur, champ);
  const messageGeneral =
    erreurGenerale(erreur) ?? (resultat?.ok === false && resultat.message);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (etape === NOMBRE_ETAPES) publierMaintenant();
        else continuer();
      }}
      className="flex flex-col gap-bloc"
    >
      <div>
        <p className="font-headline text-label-lg text-on-surface-variant">
          Étape {etape} sur {NOMBRE_ETAPES}
        </p>
        <h2
          ref={titreEtape}
          tabIndex={-1}
          className="font-headline text-headline-md text-on-surface outline-none"
        >
          {TITRES_ETAPES[etape]}
        </h2>
      </div>

      <Annonce message={messageGeneral} erreur />

      {etape === 1 && (
        <>
          <Champ
            libelle="Titre de l'activité"
            name="titre"
            autoComplete="off"
            value={saisie.titre}
            onChange={(e) => poser("titre", e.target.value)}
            maxLength={LIMITES.titre}
            compteur={{ longueur: saisie.titre.length, max: LIMITES.titre }}
            erreur={erreurDe("titre")}
            required
          />
          <ChampListe
            libelle="Catégorie"
            name="categorie"
            value={saisie.categorie}
            onChange={(e) =>
              poser("categorie", e.target.value as CategorieActivite)
            }
          >
            {categoriesActiviteListe.map((clef) => (
              <option key={clef} value={clef}>
                {categoriesActivite[clef].libelle}
              </option>
            ))}
          </ChampListe>
          <ChampTexte
            libelle="Mot d'accueil"
            name="mot_accueil"
            autoComplete="off"
            rows={4}
            value={saisie.mot_accueil}
            onChange={(e) => poser("mot_accueil", e.target.value)}
            maxLength={LIMITES.mot_accueil}
            compteur={{
              longueur: saisie.mot_accueil.length,
              max: LIMITES.mot_accueil,
            }}
            erreur={erreurDe("mot_accueil")}
          />
        </>
      )}

      {etape === 2 && (
        <>
          <Champ
            libelle="Date"
            name="date_activite"
            type="date"
            autoComplete="off"
            value={saisie.date_activite}
            onChange={(e) => poser("date_activite", e.target.value)}
            erreur={erreurDe("date_activite")}
            required
          />
          <div className="flex flex-col gap-bloc desktop:flex-row">
            <Champ
              libelle="Heure de début"
              name="heure_debut"
              type="time"
              autoComplete="off"
              value={saisie.heure_debut}
              onChange={(e) => poser("heure_debut", e.target.value)}
              erreur={erreurDe("heure_debut")}
              required
              className="flex-1"
            />
            <Champ
              libelle="Heure de fin"
              name="heure_fin"
              type="time"
              autoComplete="off"
              value={saisie.heure_fin}
              onChange={(e) => poser("heure_fin", e.target.value)}
              erreur={erreurDe("heure_fin")}
              required
              className="flex-1"
            />
          </div>
          <Champ
            libelle="Lieu"
            name="lieu"
            autoComplete="off"
            value={saisie.lieu}
            onChange={(e) => poser("lieu", e.target.value)}
            erreur={erreurDe("lieu")}
            aide="Par exemple : cour intérieure, salle commune, chez vous."
            required
          />
          <Champ
            libelle="Précision d'accès"
            name="precision_acces"
            autoComplete="off"
            value={saisie.precision_acces}
            onChange={(e) => poser("precision_acces", e.target.value)}
            maxLength={LIMITES.precision_acces}
            compteur={{
              longueur: saisie.precision_acces.length,
              max: LIMITES.precision_acces,
            }}
            erreur={erreurDe("precision_acces")}
          />
        </>
      )}

      {etape === 3 && (
        <>
          <TitreSection>Places</TitreSection>
          <ChoixSegmente
            libelle="Limite de places"
            valeur={saisie.places}
            onChange={(places) => poser("places", places)}
            options={[
              {
                id: "sans_limite",
                libelle: "Sans limite",
                icone: "all_inclusive",
              },
              { id: "limitees", libelle: "Limité", icone: "group" },
            ]}
          />
          {saisie.places === "limitees" && (
            <Champ
              libelle="Nombre de places"
              name="capacite_max"
              type="number"
              inputMode="numeric"
              min={1}
              autoComplete="off"
              value={saisie.capacite_max}
              onChange={(e) => poser("capacite_max", e.target.value)}
              erreur={erreurDe("capacite_max")}
              aide="Vous y compris."
            />
          )}
          <Champ
            libelle="Minimum de participants"
            name="capacite_min"
            type="number"
            inputMode="numeric"
            min={1}
            autoComplete="off"
            value={saisie.capacite_min}
            onChange={(e) => poser("capacite_min", e.target.value)}
            erreur={erreurDe("capacite_min")}
            aide="Facultatif : en dessous, l'activité n'a pas lieu."
          />
          <ChoixEtiquettes
            groupe="accessibilite"
            valeurs={saisie.etiquettes}
            onChange={(etiquettes) => poser("etiquettes", etiquettes)}
          />
          <ChoixEtiquettes
            groupe="pour_qui"
            valeurs={saisie.etiquettes}
            onChange={(etiquettes) => poser("etiquettes", etiquettes)}
          />
          <ChampTexte
            libelle="Conseils pratiques"
            name="conseils_pratiques"
            autoComplete="off"
            value={saisie.conseils_pratiques}
            onChange={(e) => poser("conseils_pratiques", e.target.value)}
            aide="Une petite laine, des chaussures fermées…"
          />
          <ChampTexte
            libelle="Matériel à prévoir"
            name="materiel_prevoir"
            autoComplete="off"
            value={saisie.materiel_prevoir}
            onChange={(e) => poser("materiel_prevoir", e.target.value)}
            aide="Ce que vous fournissez sur place."
          />
          <ChampTexte
            libelle="Ce que vous pouvez apporter"
            name="a_apporter"
            autoComplete="off"
            value={saisie.a_apporter}
            onChange={(e) => poser("a_apporter", e.target.value)}
            aide="Ce que chacun peut amener, s'il le souhaite."
          />
        </>
      )}

      {etape === 4 && (
        <Recapitulatif
          saisie={saisie}
          onModifier={modifier}
          onAnnuler={() =>
            router.push(
              modification
                ? cheminFiche(modification.identifiant)
                : "/activites",
            )
          }
        />
      )}

      <BarreActionFixe>
        {etape > 1 && (
          <Bouton
            variante="contour"
            icone="arrow_back"
            onClick={() => aller((etape - 1) as Etape)}
            disabled={enCours}
          >
            Précédent
          </Bouton>
        )}
        <Bouton
          type="submit"
          pleineLargeur
          disabled={enCours}
          className="flex-1 text-body-lg"
        >
          {etape === NOMBRE_ETAPES
            ? modification
              ? enCours
                ? "Enregistrement…"
                : "Enregistrer"
              : enCours
                ? "Publication…"
                : "Publier"
            : "Continuer"}
        </Bouton>
      </BarreActionFixe>
    </form>
  );
}
