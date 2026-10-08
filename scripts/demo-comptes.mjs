// Comptes et activités fictifs pour tester à la main : un syndic, des résidents dans chaque statut,
// des activités dans chaque état, des annonces dont deux sondages.
//
// Usage :
//   npm run demo:amorcer                 crée ou rafraîchit les données (relançable sans doublon)
//   npm run demo:retirer                 supprime les comptes de démonstration et tout ce qui y tient
//   ... -- --distant                     autorise un Supabase autre que le local (à réserver à l'avant-ouverture)
//
// Lit NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY dans l'environnement (ou .env.local, qui vise
// le Supabase local). Pour viser le distant, les passer devant la commande : l'environnement l'emporte
// sur .env.local.
//
// Chaque compte a pour adresse `fakossa+test-<rôle>-<username>@gmail.com` (par exemple
// `fakossa+test-resident-danielle@gmail.com`) et pour mot de passe cette même adresse : le `test-` la
// signale comme compte de test. Ces comptes sont publics de fait : les retirer avant l'ouverture aux
// vrais résidents.
import { createClient } from "@supabase/supabase-js";

/** Ce qui distingue les données de démonstration : adresses des comptes et préfixe des identifiants publics. */
export const MODELE_DEMO = {
  prefixe: "fakossa+",
  mentionTest: "test-",
  domaine: "gmail.com",
  marqueur: "demo",
};

export const COMPTES = [
  {
    username: "syndic",
    role: "syndic",
    statut: "valide",
    prenom: "Colette",
    nom: "Durand",
  },
  {
    username: "danielle",
    role: "resident",
    statut: "valide",
    prenom: "Danielle",
    nom: "Martin",
  },
  {
    username: "marc",
    role: "resident",
    statut: "valide",
    prenom: "Marc",
    nom: "Lefèvre",
  },
  {
    username: "amina",
    role: "resident",
    statut: "valide",
    prenom: "Amina",
    nom: "Benali",
  },
  {
    username: "julien",
    role: "resident",
    statut: "valide",
    prenom: "Julien",
    nom: "Rousseau",
  },
  {
    username: "sophie",
    role: "resident",
    statut: "valide",
    prenom: "Sophie",
    nom: "Girard",
  },
  {
    username: "attente",
    role: "resident",
    statut: "en_attente",
    prenom: "Karim",
    nom: "Haddad",
  },
  {
    username: "refuse",
    role: "resident",
    statut: "refuse",
    prenom: "Paul",
    nom: "Morel",
  },
  {
    username: "retire",
    role: "resident",
    statut: "retire",
    prenom: "Lucie",
    nom: "Petit",
  },
];

/** L'adresse (et le mot de passe) d'un compte de démonstration : `<préfixe><mentionTest><rôle>-<username>@<domaine>`. */
export function adresseDemo({ role, username }, modele = MODELE_DEMO) {
  return `${modele.prefixe}${modele.mentionTest}${role}-${username}@${modele.domaine}`;
}

const echapper = (texte) => texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Vrai pour une adresse de démonstration et pour elle seule : jamais pour `fakossa@gmail.com`, la
 * vraie boîte, ni pour une adresse qui contiendrait le motif sans l'être, ni pour un rôle qu'aucun
 * compte de démonstration n'a.
 */
export function estAdresseDemo(adresse, modele = MODELE_DEMO) {
  if (typeof adresse !== "string") return false;
  const roles = [...new Set(COMPTES.map((c) => c.role))].join("|");
  const motif = new RegExp(
    `^${echapper(modele.prefixe)}${echapper(modele.mentionTest)}(?:${roles})-[a-z0-9]+@${echapper(modele.domaine)}$`,
    "i",
  );
  return motif.test(adresse);
}

/** Refuse une cible autre que le Supabase local, sauf si `--distant` l'autorise explicitement. */
export function verifierCible({ url, distant }) {
  let hote;
  try {
    hote = new URL(url).hostname;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL est absente ou illisible.");
  }
  const local = ["127.0.0.1", "localhost", "::1", "[::1]"].includes(hote);
  if (!local && !distant) {
    throw new Error(
      `La cible (${hote}) n'est pas le Supabase local. Pour écrire sur un Supabase distant, relancer avec --distant.`,
    );
  }
}

const JOUR_DE_PARIS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
});

/**
 * Le jour `AAAA-MM-JJ` dans `decalage` jours, compté depuis le jour de Paris : celui de
 * l'application et de `jour_reference()` (ticket #86). Le jour d'UTC retarde d'un jour entre
 * minuit et 2h à Paris en heure d'été (1h en heure d'hiver).
 */
export const jour = (aujourdhui, decalage) => {
  const [annee, mois, quantieme] = JOUR_DE_PARIS.format(aujourdhui)
    .split("-")
    .map(Number);
  return new Date(Date.UTC(annee, mois - 1, quantieme + decalage))
    .toISOString()
    .slice(0, 10);
};

/** Les activités de démonstration : `decalage` en jours par rapport à aujourd'hui. */
const ACTIVITES = [
  {
    titre: "Café des voisins",
    categorie: "moments_partages",
    pictogramme: "waving_hand",
    organisateur: "danielle",
    decalage: 3,
    debut: "10:00",
    fin: "12:00",
    lieu: "Hall du bâtiment A",
    description:
      "Un café, des viennoiseries et le temps de se dire bonjour. Venez comme vous êtes, avec ou sans voisin.",
    mot_accueil: "Je serai dans le hall dès 9 h 45 pour installer les tables.",
    etiquettes: ["tous_ages", "acces_plain_pied"],
    inscrits: [
      ["marc", 0],
      ["amina", 1],
      ["julien", 0],
    ],
  },
  {
    titre: "Atelier réparation de vélos",
    categorie: "creation_bricolage",
    pictogramme: "handyman",
    organisateur: "marc",
    decalage: 5,
    debut: "14:00",
    fin: "17:00",
    lieu: "Local à vélos, sous-sol",
    description:
      "On remet les vélos en état ensemble : freins, dérailleurs, crevaisons. Chacun repart avec un vélo qui roule.",
    capacite_min: 3,
    capacite_max: 8,
    materiel_prevoir: "Des vêtements qui ne craignent pas la graisse.",
    a_apporter: "Votre vélo et, si vous en avez, votre pompe.",
    precision_acces: "Porte du fond à droite de la rampe.",
    etiquettes: ["acces_plain_pied", "enfants_bienvenus"],
    inscrits: [
      ["danielle", 0],
      ["sophie", 1],
    ],
  },
  {
    titre: "Cercle de lecture",
    categorie: "culture_loisirs",
    pictogramme: "menu_book",
    organisateur: "amina",
    decalage: 7,
    debut: "18:30",
    fin: "20:00",
    lieu: "Salle commune",
    description:
      "Chacun présente le livre qu'il a aimé ce mois-ci, en quelques minutes, sans obligation de lire quoi que ce soit.",
    capacite_max: 10,
    conseils_pratiques: "Une tisane est offerte à l'arrivée.",
    etiquettes: ["ambiance_calme", "sieges_confortables", "chaises_prevues"],
    inscrits: [
      ["danielle", 0],
      ["marc", 0],
      ["julien", 1],
    ],
  },
  {
    titre: "Troc de graines et de boutures",
    categorie: "jardin_nature",
    pictogramme: "potted_plant",
    organisateur: "sophie",
    decalage: 10,
    debut: "09:30",
    fin: "11:30",
    lieu: "Cour intérieure",
    description:
      "Apportez vos surplus de graines ou de boutures, repartez avec de quoi fleurir votre balcon.",
    etiquettes: ["enfants_bienvenus", "animaux_acceptes"],
    inscrits: [["amina", 0]],
  },
  {
    titre: "Coup de main pour les courses",
    categorie: "entraide_partage",
    pictogramme: "handshake",
    organisateur: "julien",
    decalage: 2,
    debut: "16:00",
    fin: "17:00",
    lieu: "Devant l'entrée du bâtiment B",
    description:
      "Je fais les courses pour le quartier : dites-moi ce dont vous avez besoin et je le rapporte.",
    capacite_max: 3,
    inscrits: [
      ["danielle", 0],
      ["marc", 0],
    ],
  },
  {
    titre: "Après-midi jeux de société",
    categorie: "moments_partages",
    pictogramme: "waving_hand",
    organisateur: "syndic",
    decalage: 4,
    debut: "15:00",
    fin: "18:00",
    lieu: "Salle commune",
    description:
      "Le conseil syndical vous invite à un après-midi de jeux, pour tous les âges.",
    capacite_max: 4,
    etiquettes: ["tous_ages", "chaises_prevues"],
    inscrits: [
      ["danielle", 1],
      ["marc", 0],
      ["amina", 0],
    ],
  },
  {
    titre: "Sortie au jardin partagé",
    categorie: "jardin_nature",
    pictogramme: "potted_plant",
    organisateur: "sophie",
    decalage: 6,
    debut: "10:00",
    fin: "12:00",
    lieu: "Jardin partagé, rue des Tilleuls",
    description: "Sortie annulée à cause de la météo, à reprogrammer.",
    statut: "annulee",
    inscrits: [["amina", 0]],
  },
  {
    titre: "Soirée quiz entre voisins",
    categorie: "moments_partages",
    pictogramme: "waving_hand",
    organisateur: "danielle",
    decalage: -3,
    debut: "20:00",
    fin: "22:00",
    lieu: "Salle commune",
    description:
      "Des questions pour tous les goûts, par équipes de quatre. Une soirée pour rire ensemble.",
    inscrits: [
      ["marc", 0],
      ["amina", 0],
      ["julien", 0],
      ["sophie", 0],
    ],
    retours: [
      ["marc", 5, "Très bonne ambiance, on a beaucoup ri. À refaire !"],
      ["amina", 4, "Questions bien choisies, un peu court à mon goût."],
      ["julien", 3, "Sympa, mais la salle était trop bruyante."],
    ],
  },
  {
    titre: "Atelier tricot",
    categorie: "creation_bricolage",
    pictogramme: "handyman",
    organisateur: "amina",
    decalage: -10,
    debut: "14:30",
    fin: "16:30",
    lieu: "Chez Amina, 2e étage",
    description:
      "Débutants bienvenus : on apprend les premiers points autour d'un thé.",
    inscrits: [
      ["danielle", 0],
      ["sophie", 0],
    ],
    retours: [
      [
        "danielle",
        5,
        "Une après-midi douce, j'ai enfin compris le point mousse.",
      ],
    ],
  },
  {
    titre: "Vide-grenier de la cour",
    categorie: "entraide_partage",
    pictogramme: "handshake",
    organisateur: "marc",
    decalage: 12,
    debut: "09:00",
    fin: "13:00",
    lieu: "Cour intérieure",
    description:
      "Chacun installe une table et vend ce dont il ne se sert plus. Une bonne occasion de vider les caves.",
    statut: "en_relecture",
    raison_relecture:
      "Jev : la description évoque une vente entre particuliers, à confirmer par le conseil syndical.",
  },
  {
    titre: "Soirée karaoké sur le palier",
    categorie: "culture_loisirs",
    pictogramme: "menu_book",
    organisateur: "julien",
    decalage: 8,
    debut: "21:00",
    fin: "23:30",
    lieu: "Palier du 3e étage",
    description: "Micro, enceintes et bonne humeur jusque tard.",
    statut: "masquee",
    message:
      "Bonjour Julien, l'activité se termine après l'heure calme : pouvez-vous la proposer dans la salle commune, avant 22 h ?",
  },
];

/** Les annonces de démonstration ; un sondage a ses options, son échéance et les choix des répondants. */
const ANNONCES = [
  {
    type: "assemblee",
    titre: "Assemblée générale annuelle",
    texte:
      "L'assemblée générale de la copropriété se tiendra à la date ci-dessous. L'ordre du jour est affiché dans le hall.",
    quand: "Jeudi à 19 h",
    lieu: "Salle commune",
    epinglee: true,
    expire: 20,
  },
  {
    type: "sondage",
    titre: "Fête des voisins : quelle date ?",
    texte: "Aidez-nous à choisir le jour de la prochaine fête des voisins.",
    sondage: {
      question: "Quelle date préférez-vous pour la fête des voisins ?",
      options: ["Samedi 6 juin", "Samedi 13 juin", "Vendredi 19 juin"],
      echeance: 14,
      reponses: [
        ["danielle", 1],
        ["marc", 2],
        ["amina", 2],
        ["sophie", 1],
      ],
    },
  },
  {
    type: "sondage",
    titre: "Nouvelle couleur pour le hall",
    texte: "Le hall d'entrée sera repeint. Le résultat est connu.",
    sondage: {
      question: "Quelle couleur pour le hall d'entrée ?",
      options: ["Vert sauge", "Bleu gris", "Blanc cassé"],
      echeance: -2,
      reponses: [
        ["danielle", 1],
        ["marc", 1],
        ["amina", 3],
        ["julien", 1],
        ["sophie", 2],
      ],
    },
  },
  {
    type: "travaux",
    titre: "Ravalement de la façade nord",
    texte:
      "Des échafaudages seront posés côté cour. Merci de ne rien laisser sur les balcons.",
    quand: "Du 2 au 20 novembre",
    lieu: "Bâtiment B",
  },
  {
    type: "info",
    titre: "Nouveaux horaires de collecte des encombrants",
    texte:
      "La collecte passe désormais le premier mardi du mois. Les objets se déposent la veille au soir.",
  },
];

const sansSession = {
  auth: { persistSession: false, autoRefreshToken: false },
};

/** Tous les comptes du projet, page par page. */
async function listerComptes(admin) {
  const parPage = 1000;
  const comptes = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: parPage,
    });
    if (error) throw new Error(`Comptes non listés : ${error.message}`);
    comptes.push(...data.users);
    if (data.users.length < parPage) return comptes;
  }
}

function verifier(resultat, action) {
  if (resultat.error) throw new Error(`${action} : ${resultat.error.message}`);
  return resultat.data;
}

const identifiantPublic = (modele, genre, rang) =>
  `${modele.marqueur}${genre}${String(rang).padStart(7, "0")}`;

/**
 * Crée ou rafraîchit les comptes, les activités, les inscriptions, les retours, les annonces et les
 * sondages de démonstration. Relançable : les dates sont recalées sur aujourd'hui, rien n'est doublé.
 * @param {{ url: string, cleSecrete: string, modele?: typeof MODELE_DEMO, aujourdhui?: Date }} parametres
 */
export async function amorcerDemo({
  url,
  cleSecrete,
  modele = MODELE_DEMO,
  aujourdhui = new Date(),
}) {
  const admin = createClient(url, cleSecrete, sansSession);

  const existants = await listerComptes(admin);
  const ids = {};
  for (const compte of COMPTES) {
    const email = adresseDemo(compte, modele);
    const connu = existants.find((c) => c.email?.toLowerCase() === email);
    if (connu) {
      verifier(
        await admin.auth.admin.updateUserById(connu.id, {
          password: email,
          email_confirm: true,
        }),
        `Compte ${email} non mis à jour`,
      );
      ids[compte.username] = connu.id;
    } else {
      const { user } = verifier(
        await admin.auth.admin.createUser({
          email,
          password: email,
          email_confirm: true,
        }),
        `Compte ${email} non créé`,
      );
      ids[compte.username] = user.id;
    }
    verifier(
      await admin.from("profil").upsert({
        id: ids[compte.username],
        email,
        role: compte.role,
        statut: compte.statut,
        prenom: compte.prenom,
        nom: compte.nom,
      }),
      `Profil ${email} non écrit`,
    );
  }

  const activites = [];
  for (const [rang, activite] of ACTIVITES.entries()) {
    const ligne = {
      identifiant_public: identifiantPublic(modele, "a", rang + 1),
      titre: activite.titre,
      categorie: activite.categorie,
      pictogramme: activite.pictogramme,
      description: activite.description,
      date_activite: jour(aujourdhui, activite.decalage),
      heure_debut: activite.debut,
      heure_fin: activite.fin,
      lieu: activite.lieu,
      organisateur: ids[activite.organisateur],
      capacite_min: activite.capacite_min ?? null,
      capacite_max: activite.capacite_max ?? null,
      etiquettes: activite.etiquettes ?? [],
      mot_accueil: activite.mot_accueil ?? null,
      conseils_pratiques: activite.conseils_pratiques ?? null,
      materiel_prevoir: activite.materiel_prevoir ?? null,
      a_apporter: activite.a_apporter ?? null,
      precision_acces: activite.precision_acces ?? null,
      statut: activite.statut ?? "publiee",
    };
    const [cree] = verifier(
      await admin
        .from("activite")
        .upsert(ligne, { onConflict: "identifiant_public" })
        .select("id"),
      `Activité « ${activite.titre} » non écrite`,
    );
    activites.push({ ...activite, id: cree.id });
    if (activite.raison_relecture || activite.message) {
      verifier(
        await admin.from("moderation_activite").upsert({
          activite_id: cree.id,
          raison_relecture: activite.raison_relecture ?? null,
          message: activite.message ?? null,
          decidee_le: activite.message ? new Date().toISOString() : null,
        }),
        `Modération de « ${activite.titre} » non écrite`,
      );
    }
  }

  const idsActivites = activites.map((a) => a.id);
  verifier(
    await admin
      .from("inscription_activite")
      .delete()
      .in("activite_id", idsActivites),
    "Inscriptions non remises à zéro",
  );
  verifier(
    await admin.from("retour").delete().in("activite_id", idsActivites),
    "Retours non remis à zéro",
  );
  const inscriptions = activites.flatMap((a) =>
    (a.inscrits ?? []).map(([username, accompagnants]) => ({
      activite_id: a.id,
      resident_id: ids[username],
      accompagnants,
    })),
  );
  if (inscriptions.length) {
    verifier(
      await admin.from("inscription_activite").insert(inscriptions),
      "Inscriptions non écrites",
    );
  }
  const retours = activites.flatMap((a) =>
    (a.retours ?? []).map(([username, note, commentaire]) => ({
      activite_id: a.id,
      resident_id: ids[username],
      note,
      commentaire,
    })),
  );
  if (retours.length) {
    verifier(await admin.from("retour").insert(retours), "Retours non écrits");
  }

  for (const [rang, annonce] of ANNONCES.entries()) {
    const [cree] = verifier(
      await admin
        .from("annonce")
        .upsert(
          {
            identifiant_public: identifiantPublic(modele, "n", rang + 1),
            type: annonce.type,
            titre: annonce.titre,
            texte: annonce.texte ?? null,
            quand: annonce.quand ?? null,
            lieu: annonce.lieu ?? null,
            epinglee: annonce.epinglee ?? false,
            expire_le:
              annonce.expire === undefined
                ? null
                : jour(aujourdhui, annonce.expire),
          },
          { onConflict: "identifiant_public" },
        )
        .select("id"),
      `Annonce « ${annonce.titre} » non écrite`,
    );
    if (!annonce.sondage) continue;
    const [sondage] = verifier(
      await admin
        .from("sondage")
        .upsert(
          {
            annonce_id: cree.id,
            question: annonce.sondage.question,
            options: annonce.sondage.options,
            echeance: jour(aujourdhui, annonce.sondage.echeance),
          },
          { onConflict: "annonce_id" },
        )
        .select("id"),
      `Sondage « ${annonce.titre} » non écrit`,
    );
    verifier(
      await admin.from("reponse_sondage").delete().eq("sondage_id", sondage.id),
      "Réponses au sondage non remises à zéro",
    );
    verifier(
      await admin.from("reponse_sondage").insert(
        annonce.sondage.reponses.map(([username, choix]) => ({
          sondage_id: sondage.id,
          profil_id: ids[username],
          choix,
        })),
      ),
      "Réponses au sondage non écrites",
    );
  }

  return {
    comptes: COMPTES.length,
    activites: ACTIVITES.length,
    annonces: ANNONCES.length,
  };
}

/**
 * Supprime les comptes de démonstration, avec leurs profils, activités, inscriptions et retours
 * (en cascade), puis les annonces de démonstration. Rien d'autre.
 * @param {{ url: string, cleSecrete: string, modele?: typeof MODELE_DEMO }} parametres
 */
export async function retirerDemo({ url, cleSecrete, modele = MODELE_DEMO }) {
  const admin = createClient(url, cleSecrete, sansSession);
  const aRetirer = (await listerComptes(admin)).filter((c) =>
    estAdresseDemo(c.email, modele),
  );
  for (const compte of aRetirer) {
    verifier(
      await admin.auth.admin.deleteUser(compte.id),
      `Compte ${compte.email} non supprimé`,
    );
  }
  verifier(
    await admin
      .from("activite")
      .delete()
      .like("identifiant_public", `${modele.marqueur}%`),
    "Activités de démonstration non supprimées",
  );
  const annonces = verifier(
    await admin
      .from("annonce")
      .delete()
      .like("identifiant_public", `${modele.marqueur}%`)
      .select("id"),
    "Annonces de démonstration non supprimées",
  );
  return { comptes: aRetirer.length, annonces: annonces.length };
}

// Pas d'import.meta ni d'await au niveau du module : Playwright le charge en CommonJS.
if (process.argv[1]?.endsWith("demo-comptes.mjs")) {
  const [commande, ...options] = process.argv.slice(2);
  const distant = options.includes("--distant");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cleSecrete = process.env.SUPABASE_SECRET_KEY;
  const actions = { amorcer: amorcerDemo, retirer: retirerDemo };
  if (!actions[commande]) {
    console.error("Usage : npm run demo:amorcer | demo:retirer [-- --distant]");
    process.exit(1);
  }
  if (!url || !cleSecrete) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY doivent être définies (en local : npm run env:local).",
    );
    process.exit(1);
  }
  try {
    verifierCible({ url, distant });
  } catch (erreur) {
    console.error(erreur.message);
    process.exit(1);
  }
  actions[commande]({ url, cleSecrete }).then(
    (bilan) => {
      console.log(
        `${commande === "amorcer" ? "Données de démonstration écrites" : "Données de démonstration retirées"} sur ${new URL(url).host} :`,
        bilan,
      );
      if (commande === "amorcer") {
        console.log(
          `Connexion : ${adresseDemo({ role: "<rôle>", username: "<username>" })} (le mot de passe est l'adresse). Comptes : ${COMPTES.map((c) => `${c.role}-${c.username}`).join(", ")}.`,
        );
      }
    },
    (erreur) => {
      console.error(erreur.message);
      process.exit(1);
    },
  );
}
