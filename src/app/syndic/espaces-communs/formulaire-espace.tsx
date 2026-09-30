"use client";

import { useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Champ, ChampTexte } from "@/components/champ";
import {
  ChampPhotoEspace,
  type PhotoEspaceSaisie,
} from "@/components/champ-photo-espace";
import {
  ChampPlanEspace,
  type PlanEspaceSaisie,
} from "@/components/champ-plan-espace";
import { ChoixPastilles } from "@/components/choix-pastilles";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Annonce } from "@/components/formulaire";
import {
  LIMITES_ESPACE,
  SAISIE_ESPACE_VIDE,
  equipementsEspace,
  equipementsEspaceListe,
  verifierEspace,
  type ChampEspace,
  type SaisieEspace,
} from "@/lib/espaces-communs";
import { envoyerPhotos } from "@/lib/envoi-photos";
import {
  BUCKET_PHOTOS_ESPACES,
  deplacerPhoto,
} from "@/lib/photo-espace-commun";
import { retirerPhoto } from "@/lib/photos-activite";
import type { MediaEspace } from "@/lib/regles-residence";
import {
  erreurDuChamp,
  erreurGenerale,
  type ErreurFormulaire,
  type Resultat,
} from "@/lib/resultat";
import { BlocFormulaire, CLASSES_FORMULAIRE } from "../colonne-formulaire";
import { enregistrerEspace, preparerDepots, supprimerEspace } from "./actions";

type Props = {
  /**
   * Absent pour un nouvel espace commun. `photos` et `plan` : ses images enregistrées, avec
   * l'adresse signée qui les affiche (vide quand elle n'a pas pu être signée).
   */
  espace?: {
    id: string;
    saisie: SaisieEspace;
    photos: MediaEspace[];
    plan: MediaEspace | null;
  };
};

const OPTIONS_EQUIPEMENTS = equipementsEspaceListe.map((cle) => ({
  cle,
  ...equipementsEspace[cle],
}));

/** Ajouter ou modifier un espace commun ; le supprimer, derrière une confirmation. */
export function FormulaireEspace({ espace }: Props) {
  const [saisie, setSaisie] = useState<SaisieEspace>(
    espace?.saisie ?? SAISIE_ESPACE_VIDE,
  );
  const [photos, setPhotos] = useState<PhotoEspaceSaisie[]>(
    () =>
      espace?.photos.map((photo) => ({
        cle: photo.chemin,
        chemin: photo.chemin,
        apercu: photo.url,
      })) ?? [],
  );
  const [plan, setPlan] = useState<PlanEspaceSaisie | null>(
    espace?.plan
      ? { chemin: espace.plan.chemin, apercu: espace.plan.url }
      : null,
  );
  const [erreur, setErreur] = useState<ErreurFormulaire<ChampEspace>>({});
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [suppression, setSuppression] = useState(false);
  const [enCours, demarrer] = useTransition();

  function poser<C extends keyof SaisieEspace>(
    champ: C,
    valeur: SaisieEspace[C],
  ) {
    setSaisie((s) => ({ ...s, [champ]: valeur }));
  }

  function enregistrer() {
    const verdict = verifierEspace(saisie);
    setErreur(verdict);
    setResultat(null);
    if (verdict.erreur) return;
    // Enregistré, l'espace mène à la liste : seul un échec revient ici.
    demarrer(async () => {
      // Les images choisies à l'instant partent d'abord, en un seul dépôt : photos, puis plan.
      const nouvellesPhotos = photos.filter((p) => p.fichier);
      const aEnvoyer = [
        ...nouvellesPhotos.map((p) => p.fichier as Blob),
        ...(plan?.fichier ? [plan.fichier] : []),
      ];
      const envoyees = new Map<string, string>();
      let cheminPlan = plan?.chemin ?? null;
      if (aEnvoyer.length > 0) {
        const depots = await preparerDepots(aEnvoyer.map((f) => f.size));
        if (!depots.ok) return setResultat(depots);
        const chemins = await envoyerPhotos(
          depots.depots,
          aEnvoyer,
          BUCKET_PHOTOS_ESPACES,
        );
        nouvellesPhotos.forEach((p, i) => {
          const chemin = chemins[i];
          if (chemin) envoyees.set(p.cle, chemin);
        });
        if (plan?.fichier) cheminPlan = chemins[nouvellesPhotos.length];
        // Une image déposée n'est pas renvoyée à l'essai suivant : elle garde son chemin.
        setPhotos((actuelles) =>
          actuelles.map((p) =>
            envoyees.has(p.cle)
              ? { cle: p.cle, apercu: p.apercu, chemin: envoyees.get(p.cle) }
              : p,
          ),
        );
        if (plan?.fichier && cheminPlan)
          setPlan({ apercu: plan.apercu, chemin: cheminPlan });
        if (chemins.includes(null))
          return setResultat({
            ok: false,
            message:
              "Une image n'a pas pu être envoyée. Réessayez dans un instant.",
          });
      }
      setResultat(
        await enregistrerEspace(
          espace?.id ?? null,
          saisie,
          photos.map((p) => p.chemin ?? (envoyees.get(p.cle) as string)),
          cheminPlan,
        ),
      );
    });
  }

  function supprimer() {
    if (!espace) return;
    demarrer(async () => {
      const reponse = await supprimerEspace(espace.id, saisie.nom);
      setSuppression(false);
      setResultat(reponse);
    });
  }

  const erreurDe = (champ: ChampEspace) => erreurDuChamp(erreur, champ);
  const texte = (
    champ: keyof typeof LIMITES_ESPACE,
    libelle: string,
    aide?: string,
  ) => ({
    libelle,
    name: champ,
    autoComplete: "off",
    value: saisie[champ],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      poser(champ, e.target.value),
    maxLength: LIMITES_ESPACE[champ],
    erreur: erreurDe(champ),
    ...(aide
      ? { aide }
      : {
          compteur: {
            longueur: saisie[champ].length,
            max: LIMITES_ESPACE[champ],
          },
        }),
  });

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer();
      }}
      className={CLASSES_FORMULAIRE}
    >
      <Annonce
        message={
          erreurGenerale(erreur) ?? (resultat?.ok === false && resultat.message)
        }
        erreur
      />
      <BlocFormulaire>
        <Champ
          {...texte("nom", "Nom", "Par exemple : Salle commune, Cour, Jardin.")}
          required
        />
        <Champ {...texte("batiment", "Bâtiment", "Facultatif.")} />
        <Champ
          {...texte(
            "localisation",
            "Localisation",
            "Comment le trouver : étage, entrée, repère.",
          )}
        />
        <ChampTexte {...texte("description", "Description")} rows={3} />
      </BlocFormulaire>
      <BlocFormulaire>
        <ChampPhotoEspace
          photos={photos}
          nom={saisie.nom}
          onAjouter={(nouvelles) => setPhotos((p) => [...p, ...nouvelles])}
          onRetirer={(index) => setPhotos((p) => retirerPhoto(p, index))}
          onDeplacer={(index, decalage) =>
            setPhotos((p) => deplacerPhoto(p, index, decalage))
          }
        />
        <ChampPlanEspace
          plan={plan}
          nom={saisie.nom}
          onChoisir={setPlan}
          onRetirer={() => setPlan(null)}
        />
      </BlocFormulaire>
      <BlocFormulaire>
        <Champ
          libelle="Longueur (en mètres)"
          name="longueur"
          inputMode="decimal"
          autoComplete="off"
          value={saisie.longueur}
          onChange={(e) => poser("longueur", e.target.value)}
          erreur={erreurDe("longueur")}
          aide="De 0,5 à 100 m, par exemple 8,5. Vide : pas de dimensions."
        />
        <Champ
          libelle="Largeur (en mètres)"
          name="largeur"
          inputMode="decimal"
          autoComplete="off"
          value={saisie.largeur}
          onChange={(e) => poser("largeur", e.target.value)}
          erreur={erreurDe("largeur")}
          aide="De 0,5 à 100 m. À saisir avec la longueur."
        />
        <Champ
          libelle="Hauteur sous plafond (en mètres)"
          name="hauteur_plafond"
          inputMode="decimal"
          autoComplete="off"
          value={saisie.hauteur_plafond}
          onChange={(e) => poser("hauteur_plafond", e.target.value)}
          erreur={erreurDe("hauteur_plafond")}
          aide="De 1 à 15 m, par exemple 2,7. Vide : pas de hauteur."
        />
        <Champ
          libelle="Capacité"
          name="capacite"
          type="number"
          inputMode="numeric"
          min={1}
          autoComplete="off"
          value={saisie.capacite}
          onChange={(e) => poser("capacite", e.target.value)}
          erreur={erreurDe("capacite")}
          aide="Le nombre de personnes au plus. Vide : pas de limite."
        />
      </BlocFormulaire>
      <BlocFormulaire>
        <ChoixPastilles
          titre="Équipements et accessibilité"
          options={OPTIONS_EQUIPEMENTS}
          valeurs={saisie.equipements}
          onChange={(equipements) => poser("equipements", equipements)}
        />
        <Champ
          libelle="Heure de fin maximale"
          name="heure_fin_max"
          type="time"
          autoComplete="off"
          value={saisie.heure_fin_max}
          onChange={(e) => poser("heure_fin_max", e.target.value)}
          erreur={erreurDe("heure_fin_max")}
          aide="Aucune activité ne finit plus tard. Vide : pas d'heure limite."
        />
      </BlocFormulaire>
      <BlocFormulaire>
        <ChampTexte
          {...texte(
            "consignes",
            "Consignes",
            "Affichées aux voisins qui y proposent une activité, et sur sa fiche.",
          )}
          rows={3}
        />
        <Champ
          {...texte(
            "horaires_acces",
            "Horaires d'accès",
            "Par exemple : tous les jours de 9h à 21h.",
          )}
        />
        <Champ
          {...texte(
            "contact",
            "Contact",
            "Qui appeler pour la clé ou un souci.",
          )}
        />
      </BlocFormulaire>

      {espace && (
        <>
          <Bouton
            variante="danger"
            className="desktop:self-start"
            icone="delete"
            onClick={() => setSuppression(true)}
            disabled={enCours}
          >
            Supprimer l&apos;espace commun
          </Bouton>
          <FeuilleConfirmation
            ouverte={suppression}
            titre="Supprimer cet espace commun ?"
            libelleGarder="Garder l'espace"
            libelleConfirmer={enCours ? "Suppression…" : "Supprimer"}
            onFermer={() => setSuppression(false)}
            onConfirmer={supprimer}
            desactive={enCours}
          >
            Les voisins ne pourront plus le choisir. Les activités déjà prévues
            dans cet espace gardent son nom comme lieu, sans ses règles. Cette
            action est définitive.
          </FeuilleConfirmation>
        </>
      )}

      <BarreActionFixe colonne>
        <Bouton
          type="submit"
          pleineLargeur
          disabled={enCours}
          className="flex-1 text-body-lg"
        >
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
      </BarreActionFixe>
    </form>
  );
}
