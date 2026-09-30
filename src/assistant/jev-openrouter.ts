import type { ChoixJev, EntreeJev, MoteurJev, ReponseJev } from "@/assistant";
import {
  type CategorieActivite,
  type PictogrammeActivite,
} from "@/lib/categories-activite";

/** Le modèle Jev, servi par OpenRouter (API System One de TypeSafe). */
const MODELE = "jev-1.13";

const ADRESSE_PAR_DEFAUT = "https://openrouter.ai/api/v1";

/** Probabilité minimale d'un « oui » de Jev à une question sur ce qui manque, pour le signaler. */
const SEUIL_INFORMATION_MANQUANTE = 0.6;

// Jev ne rédige pas de texte : il répond à des questions typées (choix, oui/non avec sa
// probabilité). Les phrases que l'assistant montre, elles, sont écrites ici.

const CATEGORIES: Record<CategorieActivite, string> = {
  moments_partages:
    "Rencontres et moments conviviaux : goûter, apéritif, repas de quartier, jeux de société, soirée entre voisins.",
  creation_bricolage:
    "Faire ou réparer quelque chose de ses mains : bricolage, couture, tricot, cuisine créative, atelier de réparation.",
  culture_loisirs:
    "Culture et loisirs : lecture, cinéma, musique, sport, sortie, conférence, jeux.",
  entraide_partage:
    "Rendre service ou partager : troc, prêt de matériel, covoiturage, aide aux devoirs, don, coup de main.",
  jardin_nature:
    "Jardin et nature : plantation, potager, compost, balade, entretien des espaces verts.",
};

const PICTOGRAMMES: Record<PictogrammeActivite, string> = {
  celebration: "Fête, anniversaire, célébration",
  child_care: "Activité pour les enfants ou les tout-petits",
  construction: "Travaux, réparation, chantier collectif",
  diversity_3: "Rencontre entre voisins de tous horizons, accueil des nouveaux",
  forum: "Discussion, débat, café-causerie",
  groups: "Réunion ou rassemblement de nombreux voisins",
  handshake: "Entraide, service rendu, échange",
  handyman: "Bricolage, outils, atelier manuel",
  interests: "Loisirs créatifs, jeux, passe-temps",
  kitchen: "Cuisine, pâtisserie, goûter préparé ensemble",
  menu_book: "Lecture, club de lecture, échange de livres",
  park: "Balade, pique-nique, activité en plein air",
  pets: "Animaux de compagnie",
  potted_plant: "Plantes, jardinage, potager",
  table_restaurant: "Repas, apéritif, table partagée",
  waving_hand: "Accueil, rencontre, moment convivial",
};

/** Les motifs de non-conformité que Jev départage, et la raison que lit le conseil syndical. */
const NON_CONFORMITES: Record<string, { critere: string; raison: string }> = {
  nuisance_sonore: {
    critere:
      "Nuisances sonores : musique forte, fête tardive, bruit qui gênerait les voisins.",
    raison: "Nuisances sonores : l'activité risque de gêner le voisinage.",
  },
  commerce: {
    critere:
      "Commerce ou démarchage : vente, prospection, publicité pour une activité professionnelle.",
    raison: "Commerce ou démarchage : l'activité semble vendre ou démarcher.",
  },
  propos_discriminatoires: {
    critere:
      "Propos discriminatoires, haineux, injurieux ou excluant certains voisins.",
    raison:
      "Propos discriminatoires ou haineux dans le titre ou la description.",
  },
  danger: {
    critere:
      "Danger pour les personnes : pratique risquée, consommation excessive, mise en danger d'enfants.",
    raison: "Danger possible pour les personnes.",
  },
  degradation: {
    critere:
      "Dégradation ou usage abusif des parties communes ou du matériel de la résidence.",
    raison: "Risque de dégradation des espaces communs.",
  },
  autre: {
    critere:
      "Autre manquement évident aux règles de bon voisinage, sans rapport avec les motifs ci-dessus.",
    raison: "Contraire aux règles de bon voisinage.",
  },
};

/** Ce qui peut manquer à une proposition : la question posée à Jev, et la phrase qui le signale. */
const INFORMATIONS = {
  manque_materiel: {
    question:
      "Cette activité demande-t-elle du matériel, des ingrédients ou des affaires à apporter, sans que `description` dise qui les fournit ?",
    phrase: "Précisez ce que chacun doit apporter, ou ce que vous fournissez.",
  },
  manque_public: {
    question:
      "Cette activité convient-elle mal à certains publics (enfants, débutants, personnes à mobilité réduite) sans que `titre` ou `description` dise à qui elle s'adresse ?",
    phrase:
      "Précisez à qui s'adresse l'activité : enfants, débutants, tous les âges.",
  },
  manque_deroulement: {
    question:
      "Le titre et la description laissent-ils incompréhensible ce que l'on fait pendant l'activité ?",
    phrase: "Dites en une phrase ce que l'on y fait.",
  },
} as const;

const CONTEXTE =
  "Proposition d'une activité entre voisins d'une résidence en copropriété, décrite en français par `titre`, `description` et son créneau (`date`, `heureDebut`, `heureFin`). Un champ vide n'est pas encore renseigné.";

/** Les questions posées à Jev : catégorie, pictogramme, conformité, puis ce qui manque. */
function questions() {
  return {
    categorie: {
      type: "choice",
      instructions: `${CONTEXTE} Dans quelle catégorie ranger cette activité ? Se fonder sur \`titre\` et \`description\`.`,
      criteria: {
        ...CATEGORIES,
        aucune: "Aucune catégorie ne convient clairement.",
      },
    },
    pictogramme: {
      type: "choice",
      instructions: `${CONTEXTE} Quel pictogramme illustre le mieux cette activité ? Se fonder sur \`titre\` et \`description\`.`,
      criteria: {
        ...PICTOGRAMMES,
        aucun: "Aucun pictogramme ne convient clairement.",
      },
    },
    conformite: {
      type: "choice",
      instructions: `${CONTEXTE} Cette proposition respecte-t-elle les règles de bon voisinage ? Choisir « conforme » sauf manquement évident.`,
      criteria: {
        conforme: "Rien ne contrevient aux règles de bon voisinage.",
        ...Object.fromEntries(
          Object.entries(NON_CONFORMITES).map(([motif, { critere }]) => [
            motif,
            critere,
          ]),
        ),
      },
    },
    ...Object.fromEntries(
      Object.entries(INFORMATIONS).map(([cle, { question }]) => [
        cle,
        { type: "noul", instructions: `${CONTEXTE} ${question}` },
      ]),
    ),
  };
}

type Reponses = Record<string, unknown>;

function nombre(valeur: unknown): number | null {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null;
}

/** Les réponses de l'API, ou une erreur quand le statut ou le corps ne sont pas ceux attendus. */
async function reponsesDe(reponse: Response): Promise<Reponses> {
  if (!reponse.ok) throw new Error(`OpenRouter a répondu ${reponse.status}`);
  const corps: unknown = await reponse.json();
  const answers = (corps as { answers?: unknown } | null)?.answers;
  if (answers === null || typeof answers !== "object" || Array.isArray(answers))
    throw new Error("Réponse d'OpenRouter sans answers");
  return answers as Reponses;
}

/** L'option choisie et sa confiance, quand la réponse est bien un choix. */
function choixDe(reponse: unknown): ChoixJev | null {
  if (reponse === null || typeof reponse !== "object") return null;
  const { choice, confidence } = reponse as Record<string, unknown>;
  const confiance = nombre(confidence);
  return typeof choice === "string" && confiance !== null
    ? { valeur: choice, confiance }
    : null;
}

/**
 * Le verdict de conformité. La confiance d'un choix se mesure sur l'option gagnante : ici, ce
 * qui compte est la probabilité de violation, tous motifs confondus (`1 - conforme`).
 */
function conformiteDe(reponse: unknown): ReponseJev["conformite"] {
  if (reponse === null || typeof reponse !== "object") return null;
  const { probabilities } = reponse as Record<string, unknown>;
  if (probabilities === null || typeof probabilities !== "object") return null;
  const parOption = probabilities as Record<string, unknown>;
  const conforme = nombre(parOption.conforme);
  if (conforme === null) return null;

  const violation = 1 - conforme;
  if (violation < 0.5)
    return { conforme: true, raison: "", confiance: conforme };

  const motif = Object.keys(NON_CONFORMITES).reduce((meilleur, courant) =>
    (nombre(parOption[courant]) ?? 0) > (nombre(parOption[meilleur]) ?? 0)
      ? courant
      : meilleur,
  );
  return {
    conforme: false,
    raison: NON_CONFORMITES[motif].raison,
    confiance: violation,
  };
}

function informationsManquantes(reponses: Reponses): string[] {
  return Object.entries(INFORMATIONS).flatMap(([cle, { phrase }]) => {
    const oui = nombre((reponses[cle] as { noul?: unknown } | null)?.noul);
    return oui !== null && oui >= SEUIL_INFORMATION_MANQUANTE ? [phrase] : [];
  });
}

/**
 * Le moteur Jev de la configuration : `undefined` sans clé (`OPENROUTER_API_KEY`), et l'assistant
 * s'en passe. `OPENROUTER_BASE_URL` change l'adresse d'OpenRouter, pour les tests de bout en bout.
 * Seuls le titre, la description et le créneau (`EntreeJev`) partent vers OpenRouter. Toute
 * erreur (clé refusée, crédit épuisé, limite de débit, panne) fait échouer l'appel : l'assistant
 * se passe alors de Jev.
 */
export function moteurJevDepuis(
  env: Record<string, string | undefined>,
  appeler: typeof fetch = fetch,
): MoteurJev | undefined {
  const cle = env.OPENROUTER_API_KEY?.trim();
  if (!cle) return undefined;
  const adresse = (
    env.OPENROUTER_BASE_URL?.trim() || ADRESSE_PAR_DEFAUT
  ).replace(/\/+$/, "");

  return async (entree: EntreeJev, signal: AbortSignal) => {
    const reponse = await appeler(`${adresse}/systemone`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cle}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODELE,
        state: entree,
        questions: questions(),
      }),
      signal,
    });
    const reponses = await reponsesDe(reponse);
    return {
      categorie: choixDe(reponses.categorie),
      pictogramme: choixDe(reponses.pictogramme),
      informationsManquantes: informationsManquantes(reponses),
      conformite: conformiteDe(reponses.conformite),
    };
  };
}
