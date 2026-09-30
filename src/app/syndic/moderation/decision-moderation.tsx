"use client";

import { useState, useTransition } from "react";
import { Bouton } from "@/components/bouton";
import { ChampTexte } from "@/components/champ";
import { FeuilleConfirmation } from "@/components/feuille-confirmation";
import { Annonce as Message } from "@/components/formulaire";
import type { StatutActivite } from "@/components/etat-activite";
import type { Decision } from "@/lib/decision-moderation";
import type { Resultat } from "@/lib/resultat";
import { modererActivite } from "./actions";

const MAX_MESSAGE = 500;

/** Les décisions qui passent par une feuille de confirmation avec un message au créateur. */
const FEUILLES = {
  publier: {
    titre: "Publier cette activité ?",
    explication:
      "Elle devient visible de toute la résidence. Vous pouvez laisser un mot à son organisateur.",
    libelleGarder: "Garder en relecture",
    libelleConfirmer: "Publier",
    libelleChamp: "Message pour l'organisateur (facultatif)",
    obligatoire: false,
  },
  refuser: {
    titre: "Refuser cette activité ?",
    explication:
      "Elle reste masquée : seul son organisateur la voit, avec votre message.",
    libelleGarder: "Garder en relecture",
    libelleConfirmer: "Refuser",
    libelleChamp: "Message pour l'organisateur",
    obligatoire: true,
  },
  masquer: {
    titre: "Masquer cette activité ?",
    explication:
      "Les voisins ne la voient plus, même par son lien. Son organisateur la voit, avec votre message. Vous pouvez la rétablir à tout moment.",
    libelleGarder: "Garder visible",
    libelleConfirmer: "Masquer",
    libelleChamp: "Message pour l'organisateur",
    obligatoire: true,
  },
} as const;

type AvecFeuille = keyof typeof FEUILLES;

type Props = {
  identifiant: string;
  titre: string;
  statut: StatutActivite;
  /** Sur la liste : la décision y revient pour être annoncée, et chaque bouton nomme son activité. */
  surLaListe?: boolean;
};

/**
 * Les décisions du conseil syndical sur une activité, selon son état : publier ou refuser une
 * activité en relecture, masquer une activité publiée, rétablir une activité masquée. Publier,
 * refuser et masquer s'écrivent avec un message, dans une feuille du bas ; rétablir se fait d'un
 * geste.
 */
export function DecisionModeration({
  identifiant,
  titre,
  statut,
  surLaListe = false,
}: Props) {
  const [ouverte, setOuverte] = useState<AvecFeuille | null>(null);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  const feuille = ouverte ? FEUILLES[ouverte] : null;
  const nommer = surLaListe ? (
    <span className="sr-only"> : {titre}</span>
  ) : null;

  function fermer() {
    setOuverte(null);
    setMessage("");
    setErreur(null);
  }

  function decider(decision: Decision, texte: string) {
    demarrer(async () => {
      const reponse = await modererActivite(
        identifiant,
        titre,
        decision,
        texte,
        surLaListe,
      );
      if (reponse.ok) {
        setResultat(reponse);
        fermer();
      } else if (decision === "retablir") {
        setResultat(reponse);
      } else {
        setErreur(reponse.message);
      }
    });
  }

  function confirmer() {
    if (!ouverte || !feuille) return;
    const texte = message.trim();
    if (feuille.obligatoire && texte === "") {
      setErreur(
        "Écrivez un message pour expliquer votre décision à l'organisateur.",
      );
      return;
    }
    decider(ouverte, texte);
  }

  function ouvrir(decision: AvecFeuille) {
    setResultat(null);
    setOuverte(decision);
  }

  // Sur la liste en grille (ordinateur), les zones de message vides ne creusent pas d'écart
  // au-dessus des boutons.
  return (
    <div
      className={`flex flex-col gap-space-sm ${surLaListe ? "desktop:[&>div:empty]:hidden" : ""}`}
    >
      <Message message={resultat?.ok === true && resultat.message} />
      <Message message={resultat?.ok === false && resultat.message} erreur />
      <div className="flex flex-wrap gap-space-sm">
        {statut === "en_relecture" && (
          <>
            <Bouton
              variante="action"
              icone="check"
              disabled={enCours}
              onClick={() => ouvrir("publier")}
            >
              Publier{nommer}
            </Bouton>
            <Bouton
              variante="danger"
              icone="block"
              disabled={enCours}
              onClick={() => ouvrir("refuser")}
            >
              Refuser{nommer}
            </Bouton>
          </>
        )}
        {statut === "publiee" && (
          <Bouton
            variante="contour"
            icone="visibility_off"
            disabled={enCours}
            onClick={() => ouvrir("masquer")}
          >
            Masquer{nommer}
          </Bouton>
        )}
        {statut === "masquee" && (
          <Bouton
            variante="action"
            icone="visibility"
            disabled={enCours}
            onClick={() => {
              setResultat(null);
              decider("retablir", "");
            }}
          >
            Rétablir{nommer}
          </Bouton>
        )}
      </div>
      {feuille && (
        <FeuilleConfirmation
          ouverte
          titre={feuille.titre}
          libelleGarder={feuille.libelleGarder}
          libelleConfirmer={enCours ? "Envoi…" : feuille.libelleConfirmer}
          varianteConfirmer={ouverte === "publier" ? "action" : "danger"}
          onFermer={fermer}
          onConfirmer={confirmer}
          desactive={enCours}
        >
          <div className="flex flex-col gap-space-md">
            <p>{feuille.explication}</p>
            <ChampTexte
              libelle={feuille.libelleChamp}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              compteur={{ longueur: message.length, max: MAX_MESSAGE }}
              erreur={erreur ?? undefined}
              maxLength={MAX_MESSAGE}
            />
          </div>
        </FeuilleConfirmation>
      )}
    </div>
  );
}
