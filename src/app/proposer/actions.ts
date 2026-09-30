"use server";

import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  analyserProposition,
  type AvisAssistant,
  type EntreeJev,
} from "@/assistant";
import { moteurJev } from "@/assistant/jev-serveur";
import { cheminFiche } from "@/lib/partage-activite";
import {
  BUCKET_PHOTOS_ACTIVITE,
  MAX_PHOTOS,
  TAILLE_MAX_PHOTO,
  cheminPhoto,
} from "@/lib/photos-activite";
import {
  LIMITES,
  LONGUEUR_MAX_POUR_ASSISTANT,
  propositionDeNouvelleActivite,
  type NouvelleActivite,
} from "@/lib/proposition-activite";
import { clientAdmin, clientSession } from "@/lib/supabase/serveur";
import type { Resultat } from "@/lib/resultat";

/** Une photo à déposer : son chemin dans le bucket et le jeton à usage unique qui autorise le dépôt. */
export type DepotPhoto = { chemin: string; token: string };

/**
 * Ce que rend la publication d'une activité qui a des photos : l'activité est créée, il reste à
 * envoyer les photos. `enRelecture` : Jev l'a jugée non conforme, elle attend le conseil syndical
 * et n'a pas de lien à partager.
 */
export type Publication =
  | { ok: false; message: string }
  | {
      ok: true;
      identifiant: string;
      depots: DepotPhoto[];
      enRelecture: boolean;
    };

/** Le budget d'appels à Jev sur lequel un appel se compte : celui de la création ou celui de la modification. */
type ActionJev = "creation" | "modification";

const SANS_AVIS: AvisAssistant = {
  categorieSuggeree: null,
  pictogrammeSuggere: null,
  avertissements: [],
  moderation: { avis: "pas_d_avis" },
};

/**
 * Réserve auprès de la base un appel à Jev pour ce compte, qui en plafonne le nombre (10 par heure
 * en création, 10 par heure en modification, 30 par jour : chaque appel coûte un appel
 * OpenRouter). Faux quand un plafond est atteint, et aussi quand la base ne répond pas : dans le
 * doute on ne paie pas, et l'appelant se passe de Jev, comme d'un Jev en panne.
 */
async function reserverAppelJev(
  compte: string,
  action: ActionJev,
): Promise<boolean> {
  try {
    const { data, error } = await clientAdmin().rpc("reserver_appel_jev", {
      p_compte: compte,
      p_action: action,
    });
    if (error) throw new Error(error.message);
    return data === true;
  } catch (erreur) {
    console.error("Réservation d'un appel à Jev impossible :", erreur);
    return false;
  }
}

/**
 * L'avis de Jev sur une proposition en cours de saisie : suggestions de catégorie et de
 * pictogramme, informations qui semblent manquer, et avis de modération. Sans clé Jev, sans
 * compte validé, plafond d'appels atteint, ou si Jev est lent ou en erreur : aucun avis. Seuls le
 * titre, la description et le créneau partent vers Jev ; le texte est borné comme en base. Le
 * parcours qui l'appelle est celui d'une création : ses appels comptent sur ce budget.
 */
export async function avisJev(entree: EntreeJev): Promise<AvisAssistant> {
  const jev = moteurJev();
  if (!jev) return SANS_AVIS;

  const supabase = await clientSession();
  const { data: peutParticiper } = await supabase.rpc("peut_participer");
  if (!peutParticiper) return SANS_AVIS;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await reserverAppelJev(user.id, "creation"))) return SANS_AVIS;

  // Le navigateur envoie ce qu'il veut : on ne retient que le titre, la description et le
  // créneau, en texte borné, et rien du lieu ni des places.
  const texte = (valeur: unknown, max: number) =>
    typeof valeur === "string" ? valeur.slice(0, max) : "";
  return analyserProposition(
    {
      titre: texte(entree?.titre, LIMITES.titre),
      description: texte(entree?.description, LONGUEUR_MAX_POUR_ASSISTANT),
      categorie: null,
      date: texte(entree?.date, 10),
      heureDebut: texte(entree?.heureDebut, 8),
      heureFin: texte(entree?.heureFin, 8),
      lieu: { type: "libre", libelle: "" },
      capaciteMax: null,
    },
    undefined,
    { jev },
  );
}

/**
 * Conclut la pré-modération d'une activité que la base vient de mettre en relecture (création ou
 * modification par son créateur) : Jev est écouté, puis le serveur, seul à tenir la clé secrète,
 * la publie ou la laisse au conseil syndical avec la raison de Jev. Jev ne bloque jamais : sans
 * clé, sans avis, en panne ou plafond d'appels atteint (voir `reserverAppelJev`), l'activité est
 * publiée. L'inverse vaut si la conclusion elle-même échoue : l'activité reste en relecture, chez
 * son créateur et le conseil syndical, jamais chez tous. Vrai si elle est en relecture.
 */
async function conclurePreModeration(
  identifiant: string,
  activite: NouvelleActivite,
  compte: string,
  action: ActionJev,
): Promise<boolean> {
  const jev = moteurJev();
  const avis =
    jev && (await reserverAppelJev(compte, action))
      ? await analyserProposition(
          propositionDeNouvelleActivite(activite),
          undefined,
          { jev },
        )
      : SANS_AVIS;
  const raison =
    avis.moderation.avis === "a_relire"
      ? avis.moderation.raison.trim() || null
      : null;

  try {
    const { error } = await clientAdmin().rpc("conclure_pre_moderation", {
      p_identifiant: identifiant,
      p_raison: raison,
    });
    if (error) throw new Error(error.message);
  } catch (erreur) {
    console.error("Conclusion de la pré-modération impossible :", erreur);
    return true;
  }
  return raison !== null;
}

const messagesPhotos: Record<string, string> = {
  "42501":
    "Seuls l'organisateur et le conseil syndical peuvent changer les photos.",
  P0002: "Cette activité n'existe plus.",
  P0009: `Une activité a ${MAX_PHOTOS} photos au plus.`,
  "22023": "Une photo ne convient pas. Choisissez-en une autre.",
};

/** Vérifie le nombre et le poids des photos annoncées par le navigateur ; `null` quand elles passent. */
function refuserPhotos(poids: number[]) {
  if (poids.length > MAX_PHOTOS)
    return `Une activité a ${MAX_PHOTOS} photos au plus.`;
  if (poids.some((octets) => !(octets > 0 && octets <= TAILLE_MAX_PHOTO)))
    return "Une photo est trop lourde. Choisissez-en une autre.";
  return null;
}

/**
 * Autorise le navigateur à déposer `nombre` photos dans le dossier de l'activité : un chemin et
 * un jeton à usage unique par photo, les fichiers ne transitent pas par le serveur. La base ne
 * laisse déposer que le créateur et le conseil syndical.
 */
async function preparerDepots(
  supabase: SupabaseClient,
  activiteId: string,
  nombre: number,
): Promise<DepotPhoto[] | null> {
  const depots: DepotPhoto[] = [];
  for (let i = 0; i < nombre; i++) {
    const chemin = cheminPhoto(activiteId, randomUUID());
    const { data, error } = await supabase.storage
      .from(BUCKET_PHOTOS_ACTIVITE)
      .createSignedUploadUrl(chemin);
    if (error) return null;
    depots.push({ chemin, token: data.token });
  }
  return depots;
}

/** Supprime des fichiers du bucket ; au pire, un fichier orphelin y reste : plus aucune activité ne le montre. */
async function retirerFichiers(supabase: SupabaseClient, chemins: string[]) {
  if (chemins.length > 0)
    await supabase.storage.from(BUCKET_PHOTOS_ACTIVITE).remove(chemins);
}

/** Les règles bloquantes d'un espace commun, que la base vérifie aussi. */
const reglesEspace: Record<string, string> = {
  P0007:
    "L'activité finit après l'heure de fermeture de l'espace commun. Corrigez l'heure de fin.",
  P0008:
    "L'activité a plus de places que l'espace commun n'en accueille. Corrigez le nombre de places.",
  "23503": "Cet espace commun n'existe plus. Choisissez un autre lieu.",
};

const messages: Record<string, string> = {
  ...reglesEspace,
  "42501":
    "Vous pourrez publier dès que le conseil syndical aura validé votre compte.",
  "23514":
    "Une information ne convient pas. Vérifiez le titre, la date, l'horaire, le lieu et le nombre de places.",
  "22P02": "Une étiquette n'est pas reconnue. Cochez à nouveau les étiquettes.",
};

/**
 * Publie une activité. Sans photo, mène droit à l'écran qui donne son lien et son message
 * WhatsApp ; avec des photos (`poidsPhotos`, en octets, une par photo à envoyer), l'activité est
 * créée puis les dépôts sont rendus : le navigateur envoie les photos, puis appelle
 * `definirPhotos`. La base vérifie les droits, les contraintes et les règles bloquantes de
 * l'espace commun ; seul un échec revient au parcours. L'activité naît en relecture (la base y
 * veille, même pour une écriture directe avec la clé publiable) et n'est publiée qu'une fois Jev
 * entendu ; si Jev la juge non conforme, elle y reste et l'écran de partage laisse place à sa fiche.
 */
export async function publier(
  activite: NouvelleActivite,
  poidsPhotos: number[] = [],
): Promise<Publication> {
  const refus = refuserPhotos(poidsPhotos);
  if (refus) return { ok: false, message: refus };

  const supabase = await clientSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      message: "Connectez-vous pour publier votre activité.",
    };
  }

  const { data, error } = await supabase
    .from("activite")
    .insert({ ...activite, organisateur: user.id })
    .select("id, identifiant_public")
    .single();

  if (error) {
    return {
      ok: false,
      message:
        messages[error.code ?? ""] ??
        "L'activité n'a pas pu être publiée. Réessayez dans un instant.",
    };
  }

  // La base l'a mise en relecture : elle n'est publique qu'une fois Jev entendu.
  const enRelecture = await conclurePreModeration(
    data.identifiant_public,
    activite,
    user.id,
    "creation",
  );
  revalidatePath("/");
  if (poidsPhotos.length === 0)
    redirect(
      enRelecture
        ? cheminFiche(data.identifiant_public)
        : `${cheminFiche(data.identifiant_public)}/publiee`,
    );
  return {
    ok: true,
    identifiant: data.identifiant_public,
    enRelecture,
    // Sans dépôt (Storage indisponible), le navigateur le constate : l'activité est publiée sans ses photos.
    depots: (await preparerDepots(supabase, data.id, poidsPhotos.length)) ?? [],
  };
}

/**
 * Autorise le dépôt de `poidsPhotos.length` photos dans le dossier d'une activité existante,
 * avant l'enregistrement de sa modification.
 */
export async function preparerDepotsPhotos(
  identifiant: string,
  poidsPhotos: number[],
): Promise<
  { ok: true; depots: DepotPhoto[] } | { ok: false; message: string }
> {
  const refus = refuserPhotos(poidsPhotos);
  if (refus) return { ok: false, message: refus };

  const supabase = await clientSession();
  const { data } = await supabase
    .from("activite")
    .select("id")
    .eq("identifiant_public", identifiant)
    .maybeSingle();
  if (!data) return { ok: false, message: "Cette activité n'existe plus." };

  const depots = await preparerDepots(supabase, data.id, poidsPhotos.length);
  if (!depots)
    return {
      ok: false,
      message:
        "Les photos n'ont pas pu être envoyées. Réessayez dans un instant.",
    };
  return { ok: true, depots };
}

/**
 * Fixe la liste ordonnée des photos d'une activité, la première étant l'image de sa carte, puis
 * supprime du bucket celles qui n'y figurent plus.
 */
async function fixerPhotos(
  supabase: SupabaseClient,
  identifiant: string,
  chemins: string[],
): Promise<Resultat> {
  const { data, error } = await supabase.rpc("definir_photos_activite", {
    p_identifiant: identifiant,
    p_chemins: chemins,
  });
  if (error)
    return {
      ok: false,
      message:
        messagesPhotos[error.code ?? ""] ??
        "Les photos n'ont pas pu être enregistrées. Réessayez dans un instant.",
    };
  await retirerFichiers(supabase, data as string[]);
  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  return { ok: true, message: "Photos enregistrées." };
}

/** Enregistre les photos d'une activité qui vient d'être publiée, une fois envoyées. */
export async function definirPhotos(
  identifiant: string,
  chemins: string[],
): Promise<Resultat> {
  return fixerPhotos(await clientSession(), identifiant, chemins);
}

const messagesModification: Record<string, string> = {
  ...reglesEspace,
  "23514":
    "Une information ne convient pas. Vérifiez le titre, la date, l'horaire, le lieu et le nombre de places.",
  "22P02": "Une étiquette n'est pas reconnue. Cochez à nouveau les étiquettes.",
  P0005:
    "Il y a déjà plus d'inscrits que de places. Augmentez le nombre de places.",
};

/**
 * Enregistre la modification d'une activité, puis revient à sa fiche. La base ne laisse passer
 * que le créateur, sur une activité non annulée : sinon aucune ligne n'est touchée. `photos` : la
 * nouvelle liste ordonnée, photos déjà envoyées comprises ; absente, les photos ne changent pas.
 * Jev relit ce que change le créateur, comme à la création : la base met l'activité en relecture,
 * puis elle est republiée sans objection de Jev, sinon elle reste au conseil syndical. Chaque
 * relecture consomme un appel du budget de modification, qui est séparé de celui de création.
 */
export async function enregistrer(
  identifiant: string,
  activite: NouvelleActivite,
  photos?: string[],
): Promise<Resultat> {
  const supabase = await clientSession();
  const { data, error } = await supabase
    .from("activite")
    .update(activite)
    .eq("identifiant_public", identifiant)
    .select("identifiant_public, statut, organisateur");

  if (error) {
    return {
      ok: false,
      message:
        messagesModification[error.code ?? ""] ??
        "Les modifications n'ont pas pu être enregistrées. Réessayez dans un instant.",
    };
  }
  if (data.length === 0) {
    return {
      ok: false,
      message:
        "Cette activité n'existe plus ou a été annulée : elle ne se modifie plus.",
    };
  }

  // Une modification du créateur remet l'activité en relecture jusqu'à l'avis de Jev. Sans
  // changement, ou par le conseil syndical, elle reste publiée (ou dans l'état où le conseil
  // syndical l'a laissée) et Jev n'est pas appelé.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    user &&
    data[0].statut === "en_relecture" &&
    data[0].organisateur === user.id
  )
    await conclurePreModeration(identifiant, activite, user.id, "modification");

  if (photos) {
    const resultat = await fixerPhotos(supabase, identifiant, photos);
    if (!resultat.ok)
      return {
        ok: false,
        message: `Les modifications sont enregistrées, mais pas les photos. ${resultat.message}`,
      };
  }

  revalidatePath(cheminFiche(identifiant));
  revalidatePath("/");
  revalidatePath("/activites");
  redirect(cheminFiche(identifiant));
}
