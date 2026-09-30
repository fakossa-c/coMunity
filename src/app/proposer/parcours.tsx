"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { analyserProposition, type ReglesResidence } from "@/assistant";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton, classesBouton } from "@/components/bouton";
import { Calendrier } from "@/components/calendrier";
import { Champ, ChampListe, ChampTexte } from "@/components/champ";
import { ChampPhotos, type PhotoSaisie } from "@/components/champ-photos";
import { ChoixLieu } from "@/components/choix-lieu";
import { ChoixEtiquettes } from "@/components/choix-etiquettes";
import { ChoixSegmente } from "@/components/choix-segmente";
import { EncartAssistant } from "@/components/encart-assistant";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Annonce } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import { TitreSection } from "@/components/titre-section";
import {
  categoriesActivite,
  categoriesActiviteListe,
  type CategorieActivite,
} from "@/lib/categories-activite";
import {
  finApresDebut,
  libelleHeure,
  optionsDebut,
  optionsFin,
} from "@/lib/creneaux";
import { envoyerPhotos } from "@/lib/envoi-photos";
import type { EspaceCommun } from "@/lib/espaces-communs";
import {
  LIEU_LIBRE,
  LIMITES,
  NOMBRE_ETAPES,
  SAISIE_VIDE,
  TITRES_ETAPES,
  appliquerSuggestions,
  avertissementsApplicables,
  blocageDeLEtape,
  changerCategorie,
  dureeDe,
  entreeJevDe,
  pictogrammeDeLaSaisie,
  propositionDe,
  resteARemplir,
  type PointARemplir,
  verifierEtape,
  verifierPage,
  versNouvelleActivite,
  type ChampSaisie,
  type Etape,
  type NouvelleActivite,
  type SaisieActivite,
} from "@/lib/proposition-activite";
import {
  erreurDuChamp,
  erreurGenerale,
  type ErreurFormulaire,
  type Resultat,
} from "@/lib/resultat";
import { aujourdhui, cheminFiche, jourLong } from "@/lib/partage-activite";
import {
  MAX_PHOTOS,
  messagePhotosIncompletes,
  mettreEnPremier,
  retirerPhoto,
} from "@/lib/photos-activite";
import {
  avisJev,
  definirPhotos,
  type DepotPhoto,
  enregistrer,
  preparerDepotsPhotos,
  publier,
} from "./actions";
import { useAvisAssistant } from "./avis-assistant";
import { BlocSaisie } from "./bloc-saisie";
import { ColonneApercu } from "./colonne-apercu";
import {
  useConfirmationDeSortie,
  useDefilementVersLErreur,
} from "./garde-de-page";
import { Recapitulatif } from "./recapitulatif";
import { useBureau } from "./utiliser-bureau";

type Erreur = ErreurFormulaire<ChampSaisie>;

type Props = {
  /** Les espaces communs à proposer à l'étape 2, avant « Autre lieu… ». */
  espaces: EspaceCommun[];
  /** Les règles de la résidence que l'assistant applique. */
  regles: ReglesResidence;
  /** La saisie de départ : vide pour une nouvelle activité, pré-remplie pour modifier ou dupliquer. */
  initial?: SaisieActivite;
  /**
   * Présent quand on modifie une activité existante : le dernier écran enregistre au lieu de
   * publier, et la capacité ne peut pas descendre sous les `placesPrises` personnes inscrites.
   */
  modification?: { identifiant: string; placesPrises: number };
  /** En modification, les photos déjà enregistrées, dans l'ordre : leur chemin et leur adresse publique. */
  photosInitiales?: { chemin: string; url: string }[];
  /**
   * Vrai pour Proposer : sur ordinateur, le parcours devient une page unique de six blocs avec, à
   * droite, l'aperçu vivant de la carte. Le mobile garde ses étapes. Faux pour Modifier, qui
   * garde ses étapes partout.
   */
  pageUnique?: boolean;
  /** L'espace commun que l'adresse `?espace=` préchoisit, quand l'activité n'est pas déjà remplie. */
  espaceInitial?: string;
};

/** Les photos déjà envoyées gardent leur chemin ; les autres n'ont que leur fichier compressé. */
function cheminsDe(photos: PhotoSaisie[]) {
  return photos.flatMap((photo) => (photo.chemin ? [photo.chemin] : []));
}

/**
 * Le parcours de création en 4 étapes : la saisie reste en mémoire d'une étape à l'autre. Il sert
 * aussi à modifier une activité (pré-rempli) et à en dupliquer une (pré-rempli sans la date).
 * Tous les champs sont dans la page, ceux des étapes qui ne sont pas courantes masqués : sur
 * ordinateur, `pageUnique` les montre tous, en six blocs, à côté de l'aperçu de la carte.
 */
export function ParcoursProposition({
  espaces,
  regles,
  initial = SAISIE_VIDE,
  modification,
  photosInitiales = [],
  pageUnique = false,
  espaceInitial = "",
}: Props) {
  const router = useRouter();
  const bureau = useBureau();
  // Vrai quand la page unique est celle qu'on voit : ce qu'elle fait en plus (l'assistant qui relit
  // en continu) ne concerne ni le mobile ni Modifier.
  const modeUnique = pageUnique && bureau;
  const [etape, setEtape] = useState<Etape>(1);
  // Vrai après « Modifier » depuis le récapitulatif : « Continuer » y ramène directement.
  const [retourRecapitulatif, setRetourRecapitulatif] = useState(false);
  // Sans espace commun dans la résidence, le lieu est d'emblée un lieu libre ; `?espace=` préchoisit
  // l'espace d'où l'on vient.
  const [saisie, setSaisie] = useState<SaisieActivite>(() => {
    const depart =
      espaceInitial && initial.espace_commun === ""
        ? { ...initial, espace_commun: espaceInitial }
        : initial;
    return espaces.length === 0 && depart.espace_commun === ""
      ? { ...depart, espace_commun: LIEU_LIBRE }
      : depart;
  });
  // La saisie de départ : « quelque chose a été saisi » veut dire qu'elle a changé.
  const [depart] = useState(() => JSON.stringify(saisie));
  const [photos, setPhotos] = useState<PhotoSaisie[]>(() =>
    photosInitiales.map(({ chemin, url }) => ({
      cle: chemin,
      apercu: url,
      chemin,
    })),
  );
  // Une activité publiée dont des photos n'ont pas pu partir : le parcours ne republie pas.
  const [apresEchec, setApresEchec] = useState<{
    identifiant: string;
    message: string;
  } | null>(null);
  // Vrai quand la fin vient du créateur (ou d'une activité existante) : le début ne la déplace plus.
  const [finChoisie, setFinChoisie] = useState(initial.heure_fin !== "");
  // Le jour de référence, comme partout dans l'app : les jours d'avant sont grisés au calendrier.
  const [jourDeReference] = useState(() => aujourdhui());
  const [erreur, setErreur] = useState<Erreur>({});
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  const titreEtape = useRef<HTMLHeadingElement>(null);
  const premiereEtape = useRef(true);
  // Ce que le créateur a choisi lui-même : l'assistant ne le remplace jamais. Une activité
  // dupliquée ou modifiée a déjà sa catégorie.
  const choixDuCreateur = useRef({
    categorie: initial !== SAISIE_VIDE,
    pictogramme: initial !== SAISIE_VIDE,
  });
  // Vrai quand la catégorie présélectionnée vient de l'assistant.
  const [categorieSuggeree, setCategorieSuggeree] = useState(false);

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

  /**
   * Choisir le début rapproche la fin si besoin : elle suit tant que le créateur ne l'a pas
   * choisie, et une fin recalculée n'est pas un choix du créateur.
   */
  function changerDebut(debut: string) {
    const fin = finApresDebut(debut, saisie.heure_fin, finChoisie);
    if (fin !== saisie.heure_fin) setFinChoisie(false);
    setSaisie((s) => ({ ...s, heure_debut: debut, heure_fin: fin }));
  }

  function changerFin(fin: string) {
    setFinChoisie(true);
    poser("heure_fin", fin);
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

  /** La saisie de l'étape, puis les règles bloquantes de l'assistant qui la concernent. */
  // En modification, la saisie de départ : ce qui n'y change pas n'est pas bloqué par l'espace.
  const reference = modification ? initial : undefined;

  async function verifier(cible: Etape) {
    // Sur la page unique, toutes les étapes se vérifient d'un coup, dans le même ordre.
    const verdict =
      cible === NOMBRE_ETAPES && modeUnique
        ? verifierPage(saisie, { placesPrises: modification?.placesPrises })
        : verifierEtape(cible, saisie, {
            placesPrises: modification?.placesPrises,
          });
    if (verdict.erreur) return verdict;
    const avis = await analyserProposition(propositionDe(saisie), regles);
    return blocageDeLEtape(
      cible,
      avertissementsApplicables(avis.avertissements, saisie, reference),
      saisie,
    );
  }

  /**
   * Jev présélectionne la catégorie et le pictogramme d'après le titre et le mot d'accueil, à
   * la première sortie de l'étape 1 d'une nouvelle activité. Sans clé, en erreur ou trop lent :
   * rien ne change et le parcours continue.
   */
  async function suggerer() {
    try {
      const avis = await avisJev(entreeJevDe(saisie));
      const suivante = appliquerSuggestions(
        saisie,
        avis,
        choixDuCreateur.current,
      );
      if (suivante.categorie !== saisie.categorie) setCategorieSuggeree(true);
      setSaisie((actuelle) =>
        appliquerSuggestions(actuelle, avis, choixDuCreateur.current),
      );
    } catch {
      // Jev ne bloque jamais le parcours.
    }
  }

  // Sur la page unique, il n'y a pas de fin d'étape 1 : Jev présélectionne la catégorie et le
  // pictogramme la première fois que le créateur quitte le titre.
  const suggestionFaite = useRef(false);
  function surSortieDuTitre() {
    if (!modeUnique || modification || suggestionFaite.current) return;
    if (saisie.titre.trim() === "") return;
    suggestionFaite.current = true;
    void suggerer();
  }

  function continuer() {
    demarrer(async () => {
      const verdict = await verifier(etape);
      setErreur(verdict);
      if (verdict.erreur) return;
      if (etape === 1 && !modification && !retourRecapitulatif)
        await suggerer();
      aller(retourRecapitulatif ? NOMBRE_ETAPES : ((etape + 1) as Etape));
    });
  }

  function retirer(index: number) {
    const photo = photos[index];
    if (photo.fichier) URL.revokeObjectURL(photo.apercu);
    setPhotos((actuelles) => retirerPhoto(actuelles, index));
  }

  /**
   * Envoie les photos choisies vers leurs dépôts. Celles qui sont parties gardent alors leur
   * chemin (un nouvel essai ne les renvoie pas) ; rend la liste ordonnée des chemins envoyés et
   * le nombre de photos restées en plan.
   */
  async function envoyer(depots: DepotPhoto[]) {
    const aEnvoyer = photos.filter((photo) => photo.fichier);
    const chemins = await envoyerPhotos(
      depots,
      aEnvoyer.map((photo) => photo.fichier as Blob),
    );
    const parCle = new Map(
      aEnvoyer.flatMap((photo, i) =>
        chemins[i] ? [[photo.cle, chemins[i]] as const] : [],
      ),
    );
    const envoyees = photos.map((photo) =>
      parCle.has(photo.cle)
        ? { ...photo, chemin: parCle.get(photo.cle), fichier: undefined }
        : photo,
    );
    setPhotos(envoyees);
    return {
      chemins: cheminsDe(envoyees),
      echecs: aEnvoyer.length - parCle.size,
    };
  }

  /** Publie l'activité, puis envoie ses photos : elle existe dès la première étape, ses photos suivent. */
  async function publierAvecPhotos(activite: NouvelleActivite) {
    const aEnvoyer = photos.filter((photo) => photo.fichier);
    const publication = await publier(
      activite,
      aEnvoyer.map((photo) => (photo.fichier as Blob).size),
    );
    if (!publication.ok) return setResultat(publication);

    const { chemins, echecs } = await envoyer(publication.depots);
    const suite =
      chemins.length > 0
        ? await definirPhotos(publication.identifiant, chemins)
        : { ok: true, message: "" };
    if (echecs === 0 && suite.ok)
      return router.push(
        publication.enRelecture
          ? cheminFiche(publication.identifiant)
          : `${cheminFiche(publication.identifiant)}/publiee`,
      );
    setApresEchec({
      identifiant: publication.identifiant,
      message: messagePhotosIncompletes(echecs, suite.ok),
    });
  }

  /** Enregistre la modification ; les photos nouvelles partent d'abord, dans le dossier de l'activité. */
  async function enregistrerAvecPhotos(
    identifiant: string,
    activite: NouvelleActivite,
  ) {
    const initiales = photosInitiales.map((photo) => photo.chemin);
    const inchangees =
      photos.length === initiales.length &&
      photos.every((photo, i) => photo.chemin === initiales[i]);
    if (inchangees)
      return setResultat(await enregistrer(identifiant, activite));

    let chemins = cheminsDe(photos);
    const aEnvoyer = photos.filter((photo) => photo.fichier);
    if (aEnvoyer.length > 0) {
      const depots = await preparerDepotsPhotos(
        identifiant,
        aEnvoyer.map((photo) => (photo.fichier as Blob).size),
      );
      if (!depots.ok) return setResultat(depots);
      const envoi = await envoyer(depots.depots);
      if (envoi.echecs > 0)
        return setResultat({
          ok: false,
          message:
            "Des photos n'ont pas pu être envoyées. Réessayez : celles qui sont parties ne sont pas renvoyées.",
        });
      chemins = envoi.chemins;
    }
    setResultat(await enregistrer(identifiant, activite, chemins));
  }

  function publierMaintenant() {
    setResultat(null);
    // Publiée ou enregistrée, l'activité mène à son écran : seul un échec revient ici.
    demarrer(async () => {
      const verdict = await verifier(NOMBRE_ETAPES);
      setErreur(verdict);
      if (verdict.erreur) return;
      const activite = versNouvelleActivite(saisie, espaces);
      if (modification)
        await enregistrerAvecPhotos(modification.identifiant, activite);
      else if (photos.length > 0) await publierAvecPhotos(activite);
      else {
        // Sans photo, une publication réussie redirige : seul un échec revient ici.
        const publication = await publier(activite);
        if (!publication.ok) setResultat(publication);
      }
    });
  }

  // L'assistant de la page unique relit en continu ; au mobile, c'est le récapitulatif qui le fait.
  const avis = useAvisAssistant({
    saisie,
    regles,
    reference,
    avecJev: !modification,
    actif: modeUnique,
  });

  // Une publication dont des photos n'ont pas pu partir a déjà créé l'activité : rien à perdre.
  const modifiee =
    !apresEchec && (photos.length > 0 || JSON.stringify(saisie) !== depart);
  const [sortie, setSortie] = useConfirmationDeSortie(modifiee);
  useDefilementVersLErreur(modeUnique, erreur);

  const erreurDe = (champ: ChampSaisie) => erreurDuChamp(erreur, champ);
  const espaceChoisi = espaces.find((e) => e.id === saisie.espace_commun);
  const messageGeneral =
    apresEchec?.message ??
    erreurGenerale(erreur) ??
    (resultat?.ok === false && resultat.message);

  const points = resteARemplir(saisie);
  // Un point absent de la liste (les places d'une activité sans limite) n'a rien à remplir.
  const fait = (cle: PointARemplir["cle"]) =>
    points.find((p) => p.cle === cle)?.fait ?? true;
  const lieuApercu =
    espaceChoisi?.nom ??
    (saisie.espace_commun === LIEU_LIBRE ? saisie.lieu.trim() : "");
  // Une étape du mobile est masquée quand ce n'est pas la sienne ; l'ordinateur voit toute la page.
  const masque = (numero: Etape) => etape !== numero;
  const duree = dureeDe(saisie.heure_debut, saisie.heure_fin);
  // Classes qui ne valent qu'à partir de l'ordinateur et seulement pour la page unique.
  const seulementSurMobile = pageUnique ? "desktop:hidden" : "";

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        // Sur la page unique, seul « Publier l'activité » publie : « Entrée » dans un champ ne le fait pas.
        if (modeUnique) return;
        if (etape === NOMBRE_ETAPES) publierMaintenant();
        else continuer();
      }}
      // Sur la page unique, pas de barre d'action fixe à dégager en bas : la réserve de l'écran est
      // ramenée à 2,5 rem, pour que la colonne collante finisse sa course à l'écran.
      className={`flex flex-col gap-bloc ${pageUnique ? "desktop:mb-[calc((var(--reserve-bas-bureau)-2.5rem)*-1)]" : ""}`}
    >
      <div className={seulementSurMobile}>
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

      <div className={seulementSurMobile}>
        <Annonce message={messageGeneral} erreur />
      </div>

      {pageUnique && (
        <div className="hidden desktop:block">
          <EncartAssistant
            avis={avis}
            incomplete={points.some((p) => p.obligatoire && !p.fait)}
          />
        </div>
      )}

      <div
        className={`flex flex-col gap-bloc ${
          pageUnique
            ? "desktop:grid desktop:grid-cols-[minmax(0,1fr)_24.5rem] desktop:items-start desktop:gap-8"
            : ""
        }`}
      >
        <div
          className={`flex min-w-0 flex-col gap-bloc ${pageUnique ? "desktop:gap-4" : ""}`}
        >
          <BlocSaisie
            bloc="titre-description"
            numero={1}
            titre="Titre et description"
            aide="Vos voisins lisent d'abord le titre, puis la description."
            fait={fait("titre")}
            masqueSurMobile={masque(1)}
            pageUnique={pageUnique}
          >
            <Champ
              libelle="Titre de l'activité"
              name="titre"
              autoComplete="off"
              value={saisie.titre}
              onChange={(e) => poser("titre", e.target.value)}
              onBlur={surSortieDuTitre}
              maxLength={LIMITES.titre}
              compteur={{ longueur: saisie.titre.length, max: LIMITES.titre }}
              erreur={erreurDe("titre")}
              required
            />
            <ChampTexte
              libelle="Description"
              name="description"
              autoComplete="off"
              rows={5}
              placeholder="Décrivez le déroulement de l'activité, pour qui elle est faite et comment venir."
              value={saisie.description}
              onChange={(e) => poser("description", e.target.value)}
              maxLength={LIMITES.description}
              compteur={{
                longueur: saisie.description.length,
                max: LIMITES.description,
              }}
              erreur={erreurDe("description")}
            />
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
          </BlocSaisie>

          <BlocSaisie
            bloc="categorie"
            numero={2}
            titre="Catégorie"
            aide="Elle donne sa couleur à la carte de votre activité."
            fait
            masqueSurMobile={masque(1)}
            pageUnique={pageUnique}
          >
            <ChampListe
              libelle="Catégorie"
              name="categorie"
              value={saisie.categorie}
              onChange={(e) => {
                choixDuCreateur.current.categorie = true;
                setCategorieSuggeree(false);
                setSaisie((s) =>
                  changerCategorie(s, e.target.value as CategorieActivite),
                );
              }}
              aide={
                categorieSuggeree
                  ? "Suggérée d'après votre titre. Changez-la si elle ne convient pas."
                  : undefined
              }
            >
              {categoriesActiviteListe.map((clef) => (
                <option key={clef} value={clef}>
                  {categoriesActivite[clef].libelle}
                </option>
              ))}
            </ChampListe>
            {saisie.pictogramme !== "" && (
              <div className="flex flex-wrap items-center gap-space-sm">
                <Icone nom={pictogrammeDeLaSaisie(saisie)} taille={28} />
                <span className="text-body-md text-on-surface-variant">
                  Pictogramme suggéré d&apos;après votre titre.
                </span>
                <Bouton
                  type="button"
                  variante="fantome"
                  onClick={() => {
                    choixDuCreateur.current.pictogramme = true;
                    poser("pictogramme", "");
                    // La ligne disparaît : le focus revient au champ voisin, pas au corps de la page.
                    document
                      .querySelector<HTMLSelectElement>(
                        'select[name="categorie"]',
                      )
                      ?.focus();
                  }}
                >
                  Garder celui de la catégorie
                </Bouton>
              </div>
            )}
          </BlocSaisie>

          <BlocSaisie
            bloc="photos"
            numero={3}
            titre="Photos"
            fait={photos.length > 0}
            masqueSurMobile={masque(1)}
            pageUnique={pageUnique}
          >
            <ChampPhotos
              photos={photos}
              titre={saisie.titre}
              legendeMasqueeSurBureau={pageUnique}
              onAjouter={(nouvelles) =>
                setPhotos((actuelles) =>
                  [...actuelles, ...nouvelles].slice(0, MAX_PHOTOS),
                )
              }
              onRetirer={retirer}
              onMettreEnPremiere={(index) =>
                setPhotos((actuelles) => mettreEnPremier(actuelles, index))
              }
            />
          </BlocSaisie>

          <BlocSaisie
            bloc="date-heure"
            numero={4}
            titre="Date et heure"
            aide="Un jour, une heure de début et une heure de fin."
            fait={fait("date_heure")}
            masqueSurMobile={masque(2)}
            pageUnique={pageUnique}
          >
            <div
              className={`flex flex-col gap-bloc ${
                pageUnique
                  ? "desktop:grid desktop:grid-cols-[minmax(0,23.5rem)_minmax(0,1fr)] desktop:items-start desktop:gap-7"
                  : ""
              }`}
            >
              <Calendrier
                libelle="Date"
                valeur={saisie.date_activite}
                onChange={(date) => poser("date_activite", date)}
                aujourdhui={jourDeReference}
                erreur={erreurDe("date_activite")}
              />
              <div className="flex flex-col gap-bloc">
                {pageUnique && (
                  <p className="hidden font-headline text-headline-md text-texte-date desktop:block">
                    {saisie.date_activite
                      ? jourLong(saisie.date_activite)
                      : "Choisissez un jour"}
                  </p>
                )}
                <div
                  className={`flex flex-col gap-bloc ${pageUnique ? "" : "desktop:flex-row"}`}
                >
                  <ChampListe
                    libelle="Heure de début"
                    name="heure_debut"
                    value={saisie.heure_debut}
                    onChange={(e) => changerDebut(e.target.value)}
                    erreur={erreurDe("heure_debut")}
                    required
                    className="flex-1"
                  >
                    <option value="" disabled>
                      Choisir l&apos;heure
                    </option>
                    {optionsDebut(saisie.heure_debut).map((heure) => (
                      <option key={heure} value={heure}>
                        {libelleHeure(heure)}
                      </option>
                    ))}
                  </ChampListe>
                  <ChampListe
                    libelle="Heure de fin"
                    name="heure_fin"
                    value={saisie.heure_fin}
                    onChange={(e) => changerFin(e.target.value)}
                    erreur={erreurDe("heure_fin")}
                    required
                    className="flex-1"
                  >
                    <option value="" disabled>
                      Choisir l&apos;heure
                    </option>
                    {optionsFin(saisie.heure_debut, saisie.heure_fin).map(
                      (heure) => (
                        <option key={heure} value={heure}>
                          {libelleHeure(heure)}
                        </option>
                      ),
                    )}
                  </ChampListe>
                </div>
                {pageUnique && duree && (
                  <p className="hidden items-center gap-space-xs text-body-lg text-on-surface-variant desktop:flex">
                    <Icone nom="schedule" taille={22} />
                    Durée : {duree}
                  </p>
                )}
              </div>
            </div>
          </BlocSaisie>

          <BlocSaisie
            bloc="lieu"
            numero={5}
            titre="Lieu"
            aide="Un espace commun de la résidence, ou un autre endroit."
            fait={fait("lieu")}
            masqueSurMobile={masque(2)}
            pageUnique={pageUnique}
          >
            <ChoixLieu
              espaces={espaces}
              espaceCommun={saisie.espace_commun}
              lieu={saisie.lieu}
              onEspaceChange={(valeur) => poser("espace_commun", valeur)}
              onLieuChange={(lieu) => poser("lieu", lieu)}
              erreurEspace={erreurDe("espace_commun")}
              erreurLieu={erreurDe("lieu")}
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
          </BlocSaisie>

          <BlocSaisie
            bloc="precisions"
            numero={6}
            titre="Précisions"
            aide="Le nombre de places et ce qui aide vos voisins à venir."
            fait={fait("places")}
            masqueSurMobile={masque(3)}
            pageUnique={pageUnique}
          >
            <div className={seulementSurMobile}>
              <TitreSection>Places</TitreSection>
            </div>
            <div
              className={`flex flex-col gap-bloc ${
                pageUnique
                  ? "desktop:grid desktop:grid-cols-2 desktop:items-start desktop:gap-4"
                  : ""
              }`}
            >
              <div className="flex flex-col gap-bloc">
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
              </div>
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
            </div>
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
          </BlocSaisie>

          {etape === 4 && (
            <div className={`flex flex-col gap-bloc ${seulementSurMobile}`}>
              <Recapitulatif
                saisie={saisie}
                espace={espaceChoisi}
                regles={regles}
                reference={reference}
                avecJev={!modification}
                nombrePhotos={photos.length}
                onModifier={modifier}
              />
            </div>
          )}
        </div>

        {pageUnique && (
          <ColonneApercu
            saisie={saisie}
            lieu={lieuApercu}
            photo={photos[0]?.apercu}
            points={points}
            enCours={enCours}
            message={messageGeneral}
            voirActivite={
              apresEchec ? cheminFiche(apresEchec.identifiant) : undefined
            }
            onPublier={publierMaintenant}
          />
        )}
      </div>

      <div className={seulementSurMobile}>
        <BarreActionFixe>
          {apresEchec ? (
            <Link
              href={cheminFiche(apresEchec.identifiant)}
              className={`${classesBouton("action", true)} flex-1 text-body-lg`}
            >
              Voir l&apos;activité
            </Link>
          ) : (
            <>
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
            </>
          )}
        </BarreActionFixe>
      </div>

      <FeuilleConfirmation
        ouverte={sortie !== null}
        titre="Abandonner la proposition ?"
        libelleGarder="Continuer la saisie"
        libelleConfirmer="Abandonner"
        onFermer={() => setSortie(null)}
        onConfirmer={() => {
          const cible = sortie;
          setSortie(null);
          if (cible) router.push(cible);
        }}
      >
        Ce que vous avez saisi ne sera pas gardé.
      </FeuilleConfirmation>
    </form>
  );
}
