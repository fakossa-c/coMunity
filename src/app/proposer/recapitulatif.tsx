"use client";

import { useEffect, useState } from "react";
import { analyserProposition, type AvisAssistant } from "@/assistant";
import { Bouton } from "@/components/bouton";
import { CarteLignes, type LigneCarte } from "@/components/carte-lignes";
import { EncartAssistant } from "@/components/encart-assistant";
import { TitreSection } from "@/components/titre-section";
import { categoriesActivite } from "@/lib/categories-activite";
import {
  etiquettesActivite,
  etiquettesDuGroupe,
  type EtiquetteActivite,
  type GroupeEtiquettes,
} from "@/lib/etiquettes-activite";
import { libelleMinimum } from "@/lib/inscription-activite";
import { creneau, jourLong } from "@/lib/partage-activite";
import {
  capaciteMaxDe,
  TITRES_ETAPES,
  type Etape,
  type SaisieActivite,
} from "@/lib/proposition-activite";

type Props = {
  saisie: SaisieActivite;
  onModifier: (etape: Etape) => void;
  onAnnuler: () => void;
};

/** « 12 places », « Sans limite ». */
function libellePlaces(saisie: SaisieActivite) {
  const max = capaciteMaxDe(saisie);
  if (max === null) return "Sans limite";
  return max === 1 ? "1 place" : `${max} places`;
}

/** « Au moins 4 participants », « Aucun minimum ». */
function libelleMinimumSaisi(saisie: SaisieActivite) {
  const n = Number.parseInt(saisie.capacite_min, 10);
  return Number.isNaN(n) ? "Aucun minimum" : libelleMinimum(n);
}

/** « Accès plain-pied, Ambiance calme », ou « Rien de coché ». */
function libellesEtiquettes(
  etiquettes: EtiquetteActivite[],
  groupe: GroupeEtiquettes,
) {
  const libelles = etiquettesDuGroupe(groupe)
    .filter((cle) => etiquettes.includes(cle))
    .map((cle) => etiquettesActivite[cle].libelle);
  return libelles.length > 0 ? libelles.join(", ") : "Rien de coché";
}

/** Une carte par étape de saisie, dans l'ordre du parcours. */
function sectionsDe(
  saisie: SaisieActivite,
): { etape: Etape; lignes: LigneCarte[] }[] {
  const categorie = categoriesActivite[saisie.categorie];
  return [
    {
      etape: 1,
      lignes: [
        { icone: "edit", titre: "Titre", detail: saisie.titre },
        {
          icone: categorie.pictogramme,
          titre: "Catégorie",
          detail: categorie.libelle,
        },
        {
          icone: "waving_hand",
          titre: "Mot d'accueil",
          detail: saisie.mot_accueil || "Aucun",
        },
      ],
    },
    {
      etape: 2,
      lignes: [
        {
          icone: "event",
          titre: "Date",
          detail: jourLong(saisie.date_activite),
        },
        {
          icone: "schedule",
          titre: "Horaire",
          detail: creneau(saisie.heure_debut, saisie.heure_fin),
        },
        { icone: "location_on", titre: "Lieu", detail: saisie.lieu },
        {
          icone: "description",
          titre: "Précision d'accès",
          detail: saisie.precision_acces || "Aucune",
        },
      ],
    },
    {
      etape: 3,
      lignes: [
        {
          icone: "group",
          titre: "Nombre de places",
          detail: libellePlaces(saisie),
        },
        {
          icone: "groups",
          titre: "Minimum",
          detail: libelleMinimumSaisi(saisie),
        },
        {
          icone: "accessible",
          titre: "Accessibilité",
          detail: libellesEtiquettes(saisie.etiquettes, "accessibilite"),
        },
        {
          icone: "child_care",
          titre: "Pour qui",
          detail: libellesEtiquettes(saisie.etiquettes, "pour_qui"),
        },
        {
          icone: "lightbulb",
          titre: "Conseils pratiques",
          detail: saisie.conseils_pratiques || "Aucun",
        },
        {
          icone: "handyman",
          titre: "Matériel à prévoir",
          detail: saisie.materiel_prevoir || "Aucun",
        },
        {
          icone: "add_box",
          titre: "Ce que vous pouvez apporter",
          detail: saisie.a_apporter || "Rien de particulier",
        },
      ],
    },
  ];
}

/** Tout ce qui a été saisi, étape par étape, avec un retour vers chacune ; puis l'avis de l'assistant. */
export function Recapitulatif({ saisie, onModifier, onAnnuler }: Props) {
  const [avis, setAvis] = useState<AvisAssistant | null>(null);

  useEffect(() => {
    let actif = true;
    analyserProposition({
      titre: saisie.titre,
      description: saisie.mot_accueil,
      categorie: saisie.categorie,
      date: saisie.date_activite,
      heureDebut: saisie.heure_debut,
      heureFin: saisie.heure_fin,
      lieu: { type: "libre", libelle: saisie.lieu },
      capaciteMax: capaciteMaxDe(saisie),
    }).then((resultat) => {
      if (actif) setAvis(resultat);
    });
    return () => {
      actif = false;
    };
  }, [saisie]);

  return (
    <>
      {sectionsDe(saisie).map(({ etape, lignes }) => (
        <section key={etape} className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between gap-space-sm">
            <TitreSection>{TITRES_ETAPES[etape]}</TitreSection>
            <Bouton
              variante="fantome"
              icone="edit"
              iconeTaille={22}
              onClick={() => onModifier(etape)}
            >
              Modifier
              <span className="sr-only"> : {TITRES_ETAPES[etape]}</span>
            </Bouton>
          </div>
          <CarteLignes libelle={TITRES_ETAPES[etape]} lignes={lignes} />
        </section>
      ))}
      <EncartAssistant avis={avis} />
      <Bouton variante="danger" icone="close" onClick={onAnnuler}>
        Annuler la proposition
      </Bouton>
    </>
  );
}
