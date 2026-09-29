"use client";

import { useId, useState, useTransition } from "react";
import { BarreActionFixe } from "@/components/barre-action-fixe";
import { Bouton } from "@/components/bouton";
import { Champ, ChampTexte } from "@/components/champ";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Annonce } from "@/components/formulaire";
import { TexteReglement } from "@/components/texte-reglement";
import {
  LIMITES_SECTION,
  verifierSection,
  type ChampSection,
  type SaisieSection,
} from "@/lib/reglement";
import {
  erreurDuChamp,
  erreurGenerale,
  type ErreurFormulaire,
  type Resultat,
} from "@/lib/resultat";
import { enregistrerSection, supprimerSection } from "./actions";

type Props = {
  /** Absent pour une nouvelle section. */
  section?: { id: string; saisie: SaisieSection };
};

const AIDE_TEXTE =
  "Séparez les paragraphes par une ligne vide. Commencez une ligne par « - » pour une puce. Entourez des mots de deux étoiles pour les mettre en **gras**.";

/**
 * Ajouter ou modifier une section du règlement intérieur, avec un aperçu tel que les résidents
 * la verront ; la supprimer, derrière une confirmation.
 */
export function FormulaireSection({ section }: Props) {
  const [saisie, setSaisie] = useState<SaisieSection>(
    section?.saisie ?? { titre: "", texte: "" },
  );
  const [erreur, setErreur] = useState<ErreurFormulaire<ChampSection>>({});
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [apercu, setApercu] = useState(false);
  const [suppression, setSuppression] = useState(false);
  const [enCours, demarrer] = useTransition();
  const idApercu = useId();

  function poser(champ: ChampSection, valeur: string) {
    setSaisie((s) => ({ ...s, [champ]: valeur }));
    // L'erreur d'un champ qu'on corrige n'a plus lieu d'être.
    if (erreur.champ === champ) setErreur({});
  }

  function enregistrer() {
    const verdict = verifierSection(saisie);
    setErreur(verdict);
    setResultat(null);
    if (verdict.erreur) return;
    // Enregistrée, la section mène à la liste : seul un échec revient ici.
    demarrer(async () =>
      setResultat(await enregistrerSection(section?.id ?? null, saisie)),
    );
  }

  function supprimer() {
    if (!section) return;
    demarrer(async () => {
      const reponse = await supprimerSection(section.id, saisie.titre);
      setSuppression(false);
      setResultat(reponse);
    });
  }

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
        libelle="Titre"
        name="titre"
        autoComplete="off"
        value={saisie.titre}
        onChange={(e) => poser("titre", e.target.value)}
        maxLength={LIMITES_SECTION.titre}
        erreur={erreurDuChamp(erreur, "titre")}
        compteur={{
          longueur: saisie.titre.length,
          max: LIMITES_SECTION.titre,
        }}
        required
      />
      <ChampTexte
        libelle="Texte"
        name="texte"
        autoComplete="off"
        rows={10}
        value={saisie.texte}
        onChange={(e) => poser("texte", e.target.value)}
        maxLength={LIMITES_SECTION.texte}
        erreur={erreurDuChamp(erreur, "texte")}
        aide={AIDE_TEXTE}
        required
      />

      <Bouton
        variante="contour"
        icone={apercu ? "visibility_off" : "visibility"}
        aria-expanded={apercu}
        aria-controls={idApercu}
        onClick={() => setApercu(!apercu)}
      >
        {apercu ? "Masquer l'aperçu" : "Voir l'aperçu"}
      </Bouton>
      <div
        id={idApercu}
        role="region"
        aria-label="Aperçu de la section"
        hidden={!apercu}
        className="rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte p-4"
      >
        <p className="mb-space-sm text-body-md text-on-surface-variant">
          Voici comment les résidents liront cette section une fois dépliée.
        </p>
        <h2 className="mb-space-sm font-headline text-headline-sm text-on-surface">
          {saisie.titre.trim() || "Titre de la section"}
        </h2>
        <TexteReglement texte={saisie.texte} />
      </div>

      {section && (
        <>
          <Bouton
            variante="danger"
            icone="delete"
            onClick={() => setSuppression(true)}
            disabled={enCours}
          >
            Supprimer la section
          </Bouton>
          <FeuilleConfirmation
            ouverte={suppression}
            titre="Supprimer cette section ?"
            libelleGarder="Garder la section"
            libelleConfirmer={enCours ? "Suppression…" : "Supprimer"}
            onFermer={() => setSuppression(false)}
            onConfirmer={supprimer}
            desactive={enCours}
          >
            La section disparaît du règlement intérieur, pour les résidents
            comme pour le conseil syndical. Cette action est définitive.
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
