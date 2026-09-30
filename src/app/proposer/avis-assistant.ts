import { useEffect, useRef, useState } from "react";
import {
  analyserProposition,
  type AvisAssistant,
  type ReglesResidence,
} from "@/assistant";
import {
  entreeJevDe,
  fusionnerAvis,
  propositionDe,
  verifierPage,
  type SaisieActivite,
} from "@/lib/proposition-activite";
import { avisJev } from "./actions";

/** Le temps de calme d'une saisie avant de consulter Jev : on ne l'interroge pas à chaque frappe. */
const ATTENTE_JEV_MS = 1000;

/**
 * Combien de fois Jev est consulté pour l'encart de la page : une fois la saisie complète, puis
 * une fois de plus si le titre, la description ou le créneau changent ensuite. Chaque consultation
 * compte sur le plafond d'appels du compte, que la publication partage : le nombre de consultations
 * reste petit, comme au récapitulatif du mobile.
 */
const CONSULTATIONS_JEV_MAX = 2;

type Options = {
  saisie: SaisieActivite;
  regles: ReglesResidence;
  /** En modification, la saisie de départ (voir `avertissementsApplicables`). */
  reference?: SaisieActivite;
  /** Vrai pour une nouvelle activité : Jev en relit la proposition. */
  avecJev: boolean;
  /** Faux hors de la page unique : rien n'est calculé ni demandé. */
  actif: boolean;
};

/**
 * Le conseil de l'assistant de la page unique, en continu : les règles de la résidence à chaque
 * changement de la saisie (gratuit, immédiat), et l'avis de Jev une fois la saisie complète. Un
 * Jev absent, en erreur ou lent n'ajoute rien. `null` tant que la première lecture n'est pas faite.
 */
export function useAvisAssistant({
  saisie,
  regles,
  reference,
  avecJev,
  actif,
}: Options): AvisAssistant | null {
  const [local, setLocal] = useState<AvisAssistant | null>(null);
  const [jev, setJev] = useState<AvisAssistant | null>(null);
  const consultations = useRef(0);
  const derniereEntree = useRef("");

  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    analyserProposition(propositionDe(saisie), regles).then((avis) => {
      if (vivant) setLocal(avis);
    });
    return () => {
      vivant = false;
    };
  }, [actif, saisie, regles]);

  // Ce que Jev lit : le titre, la description et le créneau. Le lieu et les places n'en font pas
  // partie : les changer ne le consulte pas de nouveau.
  const entree = JSON.stringify(entreeJevDe(saisie));
  const complete = verifierPage(saisie).erreur === undefined;
  useEffect(() => {
    if (!actif || !avecJev || !complete) return;
    if (consultations.current >= CONSULTATIONS_JEV_MAX) return;
    if (entree === derniereEntree.current) return;
    let vivant = true;
    const minuteur = setTimeout(async () => {
      derniereEntree.current = entree;
      consultations.current += 1;
      try {
        const avis = await avisJev(JSON.parse(entree));
        if (vivant) setJev(avis);
      } catch {
        // Jev ne bloque jamais la page.
      }
    }, ATTENTE_JEV_MS);
    return () => {
      vivant = false;
      clearTimeout(minuteur);
    };
  }, [actif, avecJev, complete, entree]);

  return local && fusionnerAvis(local, jev, saisie, reference);
}
