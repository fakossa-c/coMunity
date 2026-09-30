import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { amorcerSyndic } from "../../scripts/amorcer-syndic.mjs";
import { lireSupabaseLocal } from "../../scripts/supabase-local.mjs";
import { libelleJour, libelleMois, moisDe } from "../../src/lib/calendrier";
import { aujourdhui } from "../../src/lib/partage-activite";

const local = lireSupabaseLocal();

export const MOT_DE_PASSE = "mot-de-passe-de-test";

export function nouvelEmail(prefixe: string) {
  return `${prefixe}-${randomUUID().slice(0, 8)}@exemple.fr`;
}

function clientAdmin() {
  return createClient(local.url, local.cleSecrete, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Prénom et nom d'un membre du syndic de test. */
export const IDENTITE_SYNDIC = { prenom: "Colette", nom: "Durand" };

/** Un membre du syndic créé par le script d'amorçage. */
export async function nouveauSyndic() {
  const email = nouvelEmail("syndic");
  const utilisateur = await amorcerSyndic({
    url: local.url,
    cleSecrete: local.cleSecrete,
    email,
    motDePasse: MOT_DE_PASSE,
    ...IDENTITE_SYNDIC,
  });
  return { id: utilisateur.id, email };
}

/** Un membre du syndic amorcé avant que son prénom et son nom soient demandés. */
export async function nouveauSyndicSansNom() {
  const admin = clientAdmin();
  const email = nouvelEmail("syndic");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MOT_DE_PASSE,
    email_confirm: true,
  });
  if (error) throw error;
  const profil = await admin
    .from("profil")
    .insert({ id: data.user.id, email, role: "syndic", statut: "valide" });
  if (profil.error) throw profil.error;
  return { id: data.user.id, email };
}

/** Le titre de l'Accueil : la salutation, « Bonjour Danielle ! » ou « Bonjour ! ». */
export function titreAccueil(page: Page) {
  return page.getByRole("heading", { level: 1, name: /^Bonjour/ });
}

/**
 * Le titre de la page où arrive un membre du syndic qui se connecte depuis `page` : l'espace
 * syndic sur ordinateur, l'accueil sur mobile. `mobile` vient de la fixture `isMobile` : un
 * contexte ouvert par `browser.newContext()` émule le même appareil que le projet.
 */
export function arriveeDuSyndic(page: Page, { mobile }: { mobile: boolean }) {
  return mobile
    ? titreAccueil(page)
    : page.getByRole("heading", { level: 1, name: "Espace syndic" });
}

/** Un résident, validé sauf mention contraire. */
export async function nouveauResident(
  statut: "en_attente" | "valide" | "refuse" | "retire" = "valide",
) {
  const admin = clientAdmin();
  const email = nouvelEmail("resident");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: MOT_DE_PASSE,
    email_confirm: true,
  });
  if (error) throw error;
  const profil = await admin.from("profil").insert({
    id: data.user.id,
    email,
    role: "resident",
    statut,
    prenom: "Danielle",
    nom: "Martin",
  });
  if (profil.error) throw profil.error;
  return { id: data.user.id, email };
}

/** Modifie le profil de `id` comme le ferait la personne depuis Mes informations, sans passer par l'écran. */
export async function modifierProfil(
  id: string,
  champs: Record<string, string | number | boolean | null>,
) {
  const { error } = await clientAdmin()
    .from("profil")
    .update(champs)
    .eq("id", id);
  if (error) throw error;
}

/** Les fichiers du dossier de photos de profil de `id` dans le bucket `profils`. */
export async function photosDeProfil(id: string) {
  const { data, error } = await clientAdmin().storage.from("profils").list(id);
  if (error) throw error;
  return data.map((fichier) => fichier.name);
}

/** Donne à `id` une photo de profil, comme après « Enregistrer » dans Modifier mes informations ; renvoie son chemin. */
export async function poserPhotoProfil(id: string, couleur = "#8f2b00") {
  const chemin = `${id}/${randomUUID()}.jpg`;
  const depot = await clientAdmin()
    .storage.from("profils")
    .upload(chemin, await photoJpeg(couleur, 400, 400), {
      contentType: "image/jpeg",
    });
  if (depot.error) throw depot.error;
  await modifierProfil(id, { photo_chemin: chemin });
  return chemin;
}

/** Les centres d'intérêt de `id`, dans l'ordre où ils ont été déclarés. */
export async function interetsDe(id: string) {
  const { data, error } = await clientAdmin()
    .from("centre_interet")
    .select("libelle")
    .eq("profil_id", id)
    .order("cree_le");
  if (error) throw error;
  return data.map((interet) => interet.libelle as string);
}

/** Une activité publiée au nom de `organisateur`, à venir ; renvoie son identifiant public. */
export async function nouvelleActivite(
  organisateur: string,
  activite: Partial<Record<string, string | string[] | number | null>> = {},
) {
  const dansUnMois = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await clientAdmin()
    .from("activite")
    .insert({
      titre: "Goûter crêpes",
      categorie: "moments_partages",
      pictogramme: "waving_hand",
      description: "On fait les crêpes ensemble, les jeux sont pour tous.",
      date_activite: dansUnMois,
      heure_debut: "16:00",
      heure_fin: "18:30",
      lieu: "Jardin partagé",
      organisateur,
      ...activite,
    })
    .select("identifiant_public")
    .single();
  if (error) throw error;
  return data.identifiant_public as string;
}

/**
 * Une activité à venir plus proche que toute autre (aujourd'hui à Paris, de 00h05 à 23h59) : elle prend le bloc
 * « À la une » de l'Accueil, et les activités d'un test restent dans la grille du jour.
 */
export async function nouvelleActiviteEnTete(organisateur: string) {
  return nouvelleActivite(organisateur, {
    titre: `En tête ${Date.now()}`,
    date_activite: aujourdhui(),
    heure_debut: "00:05",
    heure_fin: "23:59",
  });
}

/** Une photo JPEG unie, de la couleur donnée : de quoi illustrer une activité créée sans passer par l'écran. */
export async function photoJpeg(couleur: string, largeur = 640, hauteur = 480) {
  return sharp({
    create: {
      width: largeur,
      height: hauteur,
      channels: 3,
      background: couleur,
    },
  })
    .jpeg()
    .toBuffer();
}

/**
 * Une activité à venir qui a déjà `couleurs.length` photos, dans cet ordre, déposées comme le
 * fait le parcours (bucket `activites`, un dossier par activité) ; renvoie son identifiant
 * public et les chemins des photos.
 */
export async function nouvelleActiviteAvecPhotos(
  organisateur: string,
  couleurs: string[],
  champs: Parameters<typeof nouvelleActivite>[1] = {},
) {
  const identifiant = await nouvelleActivite(organisateur, champs);
  const admin = clientAdmin();
  const { data } = await admin
    .from("activite")
    .select("id")
    .eq("identifiant_public", identifiant)
    .single();
  const chemins: string[] = [];
  for (const couleur of couleurs) {
    const chemin = `${data?.id}/${randomUUID()}.jpg`;
    const { error } = await admin.storage
      .from("activites")
      .upload(chemin, await photoJpeg(couleur), { contentType: "image/jpeg" });
    if (error) throw error;
    chemins.push(chemin);
  }
  const { error } = await admin
    .from("activite")
    .update({ photos: chemins })
    .eq("identifiant_public", identifiant);
  if (error) throw error;
  return { identifiant, chemins };
}

/** Dépose une photo dans le dossier de l'activité sans l'ajouter à sa liste, comme un envoi resté en plan ; renvoie son chemin. */
export async function deposerPhotoNonEnregistree(identifiant: string) {
  const admin = clientAdmin();
  const { data } = await admin
    .from("activite")
    .select("id")
    .eq("identifiant_public", identifiant)
    .single();
  const chemin = `${data?.id}/${randomUUID()}.jpg`;
  const { error } = await admin.storage
    .from("activites")
    .upload(chemin, await photoJpeg("#0d3b66"), { contentType: "image/jpeg" });
  if (error) throw error;
  return chemin;
}

/** Inscrit `residentId` à l'activité désignée par son identifiant public, avec `accompagnants` personnes en plus. */
export async function inscrireResident(
  identifiant: string,
  residentId: string,
  accompagnants = 0,
) {
  const admin = clientAdmin();
  const { data: activite, error } = await admin
    .from("activite")
    .select("id")
    .eq("identifiant_public", identifiant)
    .single();
  if (error) throw error;
  const inscription = await admin.from("inscription_activite").insert({
    activite_id: activite.id,
    resident_id: residentId,
    accompagnants,
  });
  if (inscription.error) throw inscription.error;
}

/** Le retour de `residentId` sur l'activité désignée par son identifiant public, déposé sans passer par la fiche. */
export async function laisserRetour(
  identifiant: string,
  residentId: string,
  note: number,
  commentaire: string,
) {
  const admin = clientAdmin();
  const { data: activite, error } = await admin
    .from("activite")
    .select("id")
    .eq("identifiant_public", identifiant)
    .single();
  if (error) throw error;
  const retour = await admin.from("retour").insert({
    activite_id: activite.id,
    resident_id: residentId,
    note,
    commentaire,
  });
  if (retour.error) throw retour.error;
}

/** Passe l'activité à « annulée », comme le fait son créateur depuis la fiche. */
export async function annulerActivite(identifiant: string) {
  const { error } = await clientAdmin()
    .from("activite")
    .update({ statut: "annulee" })
    .eq("identifiant_public", identifiant);
  if (error) throw error;
}

/** Met l'activité en relecture avec la raison donnée, comme le fera Jev (ticket #20). */
export async function mettreEnRelecture(identifiant: string, raison: string) {
  const admin = clientAdmin();
  const { data, error } = await admin
    .from("activite")
    .update({ statut: "en_relecture" })
    .eq("identifiant_public", identifiant)
    .select("id")
    .single();
  if (error) throw error;
  const moderation = await admin
    .from("moderation_activite")
    .upsert({ activite_id: data.id, raison_relecture: raison });
  if (moderation.error) throw moderation.error;
}

/** Masque l'activité avec le message du conseil syndical à son créateur. */
export async function masquerActivite(identifiant: string, message: string) {
  const admin = clientAdmin();
  const { data, error } = await admin
    .from("activite")
    .update({ statut: "masquee" })
    .eq("identifiant_public", identifiant)
    .select("id")
    .single();
  if (error) throw error;
  const moderation = await admin
    .from("moderation_activite")
    .upsert({ activite_id: data.id, message, decidee_le: new Date() });
  if (moderation.error) throw moderation.error;
}

/** Supprime les comptes créés pendant un test, invités compris. */
export async function supprimerComptes(emails: string[]) {
  const admin = clientAdmin();
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const aSupprimer = data.users.filter((u) => emails.includes(u.email ?? ""));
  await Promise.all(aSupprimer.map((u) => admin.auth.admin.deleteUser(u.id)));
}

/**
 * Attend l'email reçu par `destinataire` dans la boîte locale de Supabase
 * et renvoie le chemin du lien qu'il contient (sans l'origine, pour le rejouer sur le serveur de test).
 */
export async function lienRecu(destinataire: string) {
  const recherche = `${local.urlBoiteMail}/api/v1/search?query=${encodeURIComponent(`to:"${destinataire}"`)}`;
  for (let essai = 0; essai < 40; essai++) {
    const { messages } = await (await fetch(recherche)).json();
    if (messages.length > 0) {
      const message = await (
        await fetch(`${local.urlBoiteMail}/api/v1/message/${messages[0].ID}`)
      ).json();
      const lien = /href="([^"]*token_hash[^"]*)"/.exec(message.HTML)?.[1];
      if (!lien) throw new Error(`Aucun lien dans l'email : ${message.HTML}`);
      const url = new URL(lien.replaceAll("&amp;", "&"));
      return url.pathname + url.search;
    }
    await new Promise((resoudre) => setTimeout(resoudre, 250));
  }
  throw new Error(`Aucun email reçu par ${destinataire}`);
}

/** Un espace commun créé comme par le conseil syndical, sous un nom jamais utilisé. */
export async function nouvelEspaceCommun(
  champs: Partial<Record<string, string | number | string[] | null>> = {},
) {
  const { data, error } = await clientAdmin()
    .from("espace_commun")
    .insert({
      nom: `Salle commune ${randomUUID().slice(0, 6)}`,
      batiment: "Bâtiment B",
      capacite: 10,
      equipements: ["acces_plain_pied", "cuisine"],
      heure_fin_max: "21:00",
      consignes: "Laissez la salle propre et fermez les fenêtres.",
      ...champs,
    })
    .select("id, nom")
    .single();
  if (error) throw error;
  return data as { id: string; nom: string };
}

/** Le chemin de la photo d'un espace commun dans le bucket `espaces-communs`, `null` sans photo. */
export async function cheminPhotoEspace(id: string) {
  const { data, error } = await clientAdmin()
    .from("espace_commun")
    .select("photo_chemin")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data.photo_chemin as string | null;
}

/** L'identifiant d'un espace commun, retrouvé par son nom. */
export async function identifiantEspaceCommun(nom: string) {
  const { data, error } = await clientAdmin()
    .from("espace_commun")
    .select("id")
    .eq("nom", nom)
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Les photos (dans l'ordre) et le plan de situation d'un espace commun, tels que la base les a. */
export async function mediasEspace(id: string) {
  const { data, error } = await clientAdmin()
    .from("espace_commun")
    .select("photos, plan_chemin")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as { photos: string[]; plan_chemin: string | null };
}

/**
 * Dépose une image unie dans le bucket `espaces-communs`, comme la saisie du conseil syndical
 * le fait, et rend son chemin : de quoi garnir la photo ou le plan d'un espace sans passer par
 * l'écran. `supprimerEspacesCommuns` retire le fichier avec l'espace.
 */
export async function deposerImageEspace(
  couleur: string,
  largeur = 1280,
  hauteur = 720,
) {
  const chemin = `${randomUUID()}.jpg`;
  const { error } = await clientAdmin()
    .storage.from("espaces-communs")
    .upload(chemin, await photoJpeg(couleur, largeur, hauteur), {
      contentType: "image/jpeg",
    });
  if (error) throw error;
  return chemin;
}

/** Vrai quand le fichier est encore dans le bucket `espaces-communs`. */
export async function photoEspaceDeposee(chemin: string) {
  const { data } = await clientAdmin()
    .storage.from("espaces-communs")
    .download(chemin);
  return data !== null;
}

/** Supprime des espaces communs, par leur nom : ceux qu'un test a créés, par l'écran ou non. */
export async function supprimerEspacesCommuns(noms: string[]) {
  const admin = clientAdmin();
  const { data } = await admin
    .from("espace_commun")
    .select("photos, plan_chemin")
    .in("nom", noms);
  const fichiers = (data ?? []).flatMap((e) => [
    ...e.photos,
    ...(e.plan_chemin ? [e.plan_chemin] : []),
  ]);
  if (fichiers.length > 0)
    await admin.storage.from("espaces-communs").remove(fichiers);
  await admin.from("espace_commun").delete().in("nom", noms);
}

/**
 * À l'étape « Date et lieu », saisit un lieu libre : choisit « Autre lieu… » dans la liste quand
 * la résidence a des espaces communs (un autre test peut en créer à tout moment), puis remplit le
 * champ.
 */
export async function saisirLieuLibre(page: Page, lieu: string) {
  const liste = page.getByLabel("Lieu", { exact: true });
  if ((await liste.count()) > 0)
    await liste.selectOption({ label: "Autre lieu…" });
  await page.getByLabel("Nom du lieu").fill(lieu);
}

/** Une section du règlement intérieur écrite comme par le conseil syndical, sous un titre jamais utilisé. */
export async function nouvelleSectionReglement(
  champs: Partial<Record<"titre" | "texte", string>> = {},
) {
  const { data, error } = await clientAdmin()
    .from("section_reglement")
    .insert({
      titre: `Bruit ${randomUUID().slice(0, 6)}`,
      texte: "Pas de bruit après 22h.\n\n- Musique douce\n- **Pas de fête**",
      ...champs,
    })
    .select("id, titre")
    .single();
  if (error) throw error;
  return data as { id: string; titre: string };
}

/** Supprime des sections du règlement intérieur, par leur titre : celles qu'un test a créées, par l'écran ou non. */
export async function supprimerSectionsReglement(titres: string[]) {
  await clientAdmin().from("section_reglement").delete().in("titre", titres);
}

/** Le thème et la taille de texte choisis par un compte, comme depuis Mes réglages. */
export async function reglerAffichage(
  compteId: string,
  reglages: { theme?: "clair" | "sombre"; taille?: "standard" | "grands" },
) {
  const { error } = await clientAdmin()
    .from("profil")
    .update(reglages)
    .eq("id", compteId);
  if (error) throw error;
}

/** Une annonce publiée comme par le conseil syndical, sous un titre jamais utilisé. */
export async function nouvelleAnnonce(
  champs: Partial<Record<string, string | boolean | null>> = {},
) {
  const { data, error } = await clientAdmin()
    .from("annonce")
    .insert({
      type: "info",
      titre: `Relevé des compteurs ${randomUUID().slice(0, 6)}`,
      texte: "Le technicien passera le mardi 3 novembre entre 9h et 12h.",
      ...champs,
    })
    .select("id, identifiant_public, titre")
    .single();
  if (error) throw error;
  return data as { id: string; identifiant_public: string; titre: string };
}

/** Supprime des annonces, par leur titre, et leurs fichiers : celles qu'un test a créées, par l'écran ou non. */
export async function supprimerAnnonces(titres: string[]) {
  const admin = clientAdmin();
  const { data } = await admin
    .from("annonce")
    .select("photo_chemin, document_chemin")
    .in("titre", titres);
  const fichiers = (data ?? [])
    .flatMap((a) => [a.photo_chemin, a.document_chemin])
    .filter((chemin): chemin is string => Boolean(chemin));
  if (fichiers.length > 0)
    await admin.storage.from("annonces").remove(fichiers);
  await admin.from("annonce").delete().in("titre", titres);
}

/** Un sondage joint à une annonce, créé par le serveur : la date limite peut être déjà passée. */
export async function nouveauSondage(
  annonceId: string,
  champs: { echeance: string; options?: string[]; question?: string },
) {
  const { data, error } = await clientAdmin()
    .from("sondage")
    .insert({
      annonce_id: annonceId,
      question: champs.question ?? "Quel créneau vous convient le mieux ?",
      options: champs.options ?? ["7h à 21h", "6h à 23h", "Accès 24h/24"],
      echeance: champs.echeance,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data as { id: string };
}

/** La réponse d'un compte à un sondage, enregistrée par le serveur. */
export async function nouvelleReponseSondage(
  sondageId: string,
  profilId: string,
  choix: number,
) {
  const { error } = await clientAdmin()
    .from("reponse_sondage")
    .insert({ sondage_id: sondageId, profil_id: profilId, choix });
  if (error) throw error;
}

/** Une fiche de Mon syndic écrite comme par le conseil syndical, sous un prénom jamais utilisé. */
export async function nouvelleFicheSyndic(
  champs: Partial<
    Record<"prenom" | "nom" | "telephone" | "email" | "compte_id", string>
  > = {},
) {
  const { data, error } = await clientAdmin()
    .from("fiche_syndic")
    .insert({
      prenom: `Marc ${randomUUID().slice(0, 6)}`,
      nom: "Lefèvre",
      ...champs,
    })
    .select("id, prenom, nom")
    .single();
  if (error) throw error;
  return data as { id: string; prenom: string; nom: string };
}

/** Supprime des fiches de Mon syndic, par leur prénom, et leurs photos : celles qu'un test a créées, par l'écran ou non. */
export async function supprimerFichesSyndic(prenoms: string[]) {
  const admin = clientAdmin();
  const { data } = await admin
    .from("fiche_syndic")
    .select("photo_chemin")
    .in("prenom", prenoms);
  const photos = (data ?? [])
    .map((f) => f.photo_chemin)
    .filter((chemin): chemin is string => Boolean(chemin));
  if (photos.length > 0) await admin.storage.from("syndic").remove(photos);
  await admin.from("fiche_syndic").delete().in("prenom", prenoms);
}

/**
 * Choisit un jour (`AAAA-MM-JJ`) au calendrier de l'étape « Date et lieu » : avance de mois en
 * mois jusqu'à celui du jour, puis touche le jour.
 */
export async function choisirDate(page: Page, date: string) {
  const calendrier = page.getByRole("group", { name: "Date", exact: true });
  const mois = calendrier.getByText(libelleMois(moisDe(date)), { exact: true });
  for (let i = 0; i < 24 && !(await mois.isVisible()); i++)
    await calendrier.getByRole("button", { name: "Mois suivant" }).click();
  await calendrier.getByRole("button", { name: libelleJour(date) }).click();
}

/**
 * Vérifie que la page ouverte ne défile pas horizontalement et qu'aucun de ses éléments n'a de
 * barre de défilement horizontale : un élément qui défile en `x`, déborde de sa boîte et affiche
 * sa barre (elle prend de la place sous son contenu). Une rangée qui se défile au doigt sur
 * mobile, où la barre est en surimpression ou masquée, n'en a pas. À appeler une fois la page
 * chargée, pour chaque écran, en largeur mobile comme en ordinateur.
 */
export async function verifierSansDefilementHorizontal(page: Page) {
  const debordements = await page.evaluate(() => {
    const racine = document.documentElement;
    const fautifs: string[] = [];
    if (racine.scrollWidth > racine.clientWidth) fautifs.push("la page");
    for (const element of document.querySelectorAll<HTMLElement>("*")) {
      const style = getComputedStyle(element);
      const defile = style.overflowX === "auto" || style.overflowX === "scroll";
      const deborde = element.scrollWidth > element.clientWidth;
      const bordures =
        parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      const barreVisible =
        element.offsetHeight - element.clientHeight - bordures > 0;
      if (defile && deborde && barreVisible) {
        fautifs.push(`${element.tagName.toLowerCase()}.${element.className}`);
      }
    }
    return fautifs;
  });
  expect(debordements, "éléments avec une barre horizontale").toEqual([]);
}

/**
 * Vrai en largeur ordinateur (à partir de 64 rem) : Proposer y est une page unique, sans étapes
 * ni « Continuer », alors que le mobile garde son parcours en quatre étapes.
 */
export function estBureau(page: Page) {
  return (page.viewportSize()?.width ?? 0) >= 1024;
}

/** Attend l'étape `numero` du parcours de Proposer ; sur ordinateur, il n'y a pas d'étapes. */
export async function etapeProposer(page: Page, numero: number) {
  if (estBureau(page)) return;
  await expect(page.getByRole("main")).toContainText(`Étape ${numero} sur 4`);
}

/** « Continuer » vers l'étape suivante de Proposer ; sur ordinateur, tout est déjà sur la page. */
export async function continuerProposer(page: Page) {
  if (estBureau(page)) return;
  await page.getByRole("button", { name: "Continuer" }).click();
}

/** L'encart « Conseils de l'assistant » que l'on voit : la page unique de l'ordinateur et le récapitulatif du mobile ont chacun le leur, l'autre restant masqué. */
export function encartAssistant(page: Page) {
  return page.getByText("Conseils de l'assistant").filter({ visible: true });
}
