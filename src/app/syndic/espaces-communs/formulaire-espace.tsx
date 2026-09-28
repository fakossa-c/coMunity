"use client";

import { useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Champ, ChampTexte } from "@/components/champ";
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
import {
  erreurDuChamp,
  erreurGenerale,
  type ErreurFormulaire,
  type Resultat,
} from "@/lib/resultat";
import { enregistrerEspace, supprimerEspace } from "./actions";

type Props = {
  /** Absent pour un nouvel espace commun. */
  espace?: { id: string; saisie: SaisieEspace };
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
    demarrer(async () =>
      setResultat(await enregistrerEspace(espace?.id ?? null, saisie)),
    );
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
      className="flex flex-col gap-bloc"
    >
      <Annonce
        message={
          erreurGenerale(erreur) ?? (resultat?.ok === false && resultat.message)
        }
        erreur
      />
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
        {...texte("contact", "Contact", "Qui appeler pour la clé ou un souci.")}
      />

      {espace && (
        <>
          <Bouton
            variante="danger"
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
