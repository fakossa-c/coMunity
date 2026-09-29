"use client";

import { useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Champ, ChampListe } from "@/components/champ";
import {
  ChampPhotoProfil,
  type PhotoProfilSaisie,
} from "@/components/champ-photo-profil";
import { Annonce } from "@/components/formulaire";
import { envoyerPhotos } from "@/lib/envoi-photos";
import {
  BATIMENTS,
  ETAGES,
  LONGUEUR_MAXIMALE_PSEUDO,
  libelleEtage,
  verifierInformations,
  type ChampInformations,
  type SaisieInformations,
} from "@/lib/informations-profil";
import { BUCKET_PHOTOS_PROFILS } from "@/lib/photo-profil";
import { erreurDuChamp, erreurGenerale } from "@/lib/resultat";
import type { ErreurFormulaire } from "@/lib/resultat";
import { enregistrerInformations, preparerDepotPhotoProfil } from "../actions";

type Props = {
  depart: SaisieInformations;
  /** La photo enregistrée, avec l'adresse signée qui l'affiche (vide si elle n'a pas pu être signée). */
  photo: { chemin: string; url: string } | null;
};

/** « Modifier mes informations » : « Annuler » en haut de l'écran, « Enregistrer » fixé en bas. */
export function FormulaireInformations({ depart, photo: photoDepart }: Props) {
  const [saisie, setSaisie] = useState(depart);
  const [photo, setPhoto] = useState<PhotoProfilSaisie | null>(
    photoDepart
      ? { chemin: photoDepart.chemin, apercu: photoDepart.url }
      : null,
  );
  const [erreur, setErreur] = useState<ErreurFormulaire<ChampInformations>>({});
  const [enCours, demarrer] = useTransition();

  function poser(champ: ChampInformations, valeur: string) {
    setSaisie((s) => ({ ...s, [champ]: valeur }));
  }

  function enregistrer() {
    const refus = verifierInformations(saisie);
    setErreur(refus ?? {});
    if (refus) return;
    // Enregistré, le profil mène à Mes informations : seul un échec revient ici.
    demarrer(async () => {
      let chemin = photo?.chemin ?? null;
      if (photo?.fichier) {
        const depot = await preparerDepotPhotoProfil(photo.fichier.size);
        if (!depot.ok) return setErreur({ erreur: depot.message });
        const [envoye] = await envoyerPhotos(
          [depot],
          [photo.fichier],
          BUCKET_PHOTOS_PROFILS,
        );
        if (!envoye) {
          return setErreur({
            erreur:
              "La photo n'a pas pu être envoyée. Réessayez dans un instant.",
          });
        }
        chemin = envoye;
        // Une photo déposée n'est pas renvoyée à l'essai suivant : elle garde son chemin.
        setPhoto({ apercu: photo.apercu, chemin: envoye });
      }
      const resultat = await enregistrerInformations(saisie, chemin);
      setErreur({ erreur: resultat.message, champ: resultat.champ });
    });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer();
      }}
      className="flex max-w-xl flex-col gap-bloc"
    >
      <Annonce message={erreurGenerale(erreur)} erreur />
      <ChampPhotoProfil
        photo={photo}
        initiale={saisie.pseudo.trim().charAt(0).toUpperCase() || "?"}
        onChoisir={setPhoto}
        onRetirer={() => setPhoto(null)}
      />
      <Champ
        libelle="Pseudo"
        aide="Le nom que vos voisins voient. Toujours visible."
        name="pseudo"
        autoComplete="nickname"
        maxLength={LONGUEUR_MAXIMALE_PSEUDO}
        required
        value={saisie.pseudo}
        onChange={(e) => poser("pseudo", e.target.value)}
        erreur={erreurDuChamp(erreur, "pseudo")}
      />
      <Champ
        libelle="Téléphone"
        aide="Facultatif. Vos voisins ne le voient que si vous le rendez visible."
        name="telephone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={saisie.telephone}
        onChange={(e) => poser("telephone", e.target.value)}
        erreur={erreurDuChamp(erreur, "telephone")}
      />
      <ChampListe
        libelle="Bâtiment"
        name="batiment"
        autoComplete="off"
        value={saisie.batiment}
        onChange={(e) => poser("batiment", e.target.value)}
        erreur={erreurDuChamp(erreur, "batiment")}
      >
        <option value="">Non renseigné</option>
        {BATIMENTS.map((batiment) => (
          <option key={batiment} value={batiment}>
            {batiment}
          </option>
        ))}
      </ChampListe>
      <ChampListe
        libelle="Étage"
        name="etage"
        autoComplete="off"
        value={saisie.etage}
        onChange={(e) => poser("etage", e.target.value)}
        erreur={erreurDuChamp(erreur, "etage")}
      >
        <option value="">Non renseigné</option>
        {ETAGES.map((etage) => (
          <option key={etage} value={etage}>
            {libelleEtage(etage)}
          </option>
        ))}
      </ChampListe>
      <BarreActionFixe>
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
