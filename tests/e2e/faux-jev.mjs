// Faux OpenRouter (API systemone) pour les tests de bout en bout : répond à la place de Jev selon le titre de la
// proposition, et garde ce qu'il a reçu (GET /requetes) pour vérifier ce qui part vers Jev.
// Lancé par playwright.config.ts : `node tests/e2e/faux-jev.mjs <port>`.
import { createServer } from "node:http";

const port = Number(process.argv[2]);
const recues = [];

const choix = (choice, probabilities) => ({
  type: "choice",
  choice,
  probabilities,
  confidence: Math.max(...Object.values(probabilities)),
});
const noul = (valeur) => ({ type: "noul", noul: valeur });

/** Les réponses d'un Jev qui n'a rien à dire : aucune catégorie, conforme, rien ne manque. */
const AUCUN_AVIS = {
  categorie: choix("aucune", { aucune: 0.9, culture_loisirs: 0.1 }),
  pictogramme: choix("aucun", { aucun: 0.9, menu_book: 0.1 }),
  conformite: choix("conforme", { conforme: 0.9, nuisance_sonore: 0.1 }),
  manque_materiel: noul(0.1),
  manque_public: noul(0.1),
  manque_deroulement: noul(0.1),
};

/** Les réponses de Jev à une proposition : le titre dit quel cas jouer. */
function reponsesPour(proposition) {
  const titre = proposition.titre ?? "";
  if (titre.includes("Bricolage"))
    return {
      ...AUCUN_AVIS,
      categorie: choix("creation_bricolage", {
        creation_bricolage: 0.9,
        aucune: 0.1,
      }),
      pictogramme: choix("kitchen", { kitchen: 0.85, aucun: 0.15 }),
      conformite: choix("conforme", { conforme: 0.95, nuisance_sonore: 0.05 }),
    };
  if (titre.includes("Incertain"))
    return {
      ...AUCUN_AVIS,
      categorie: choix("culture_loisirs", {
        culture_loisirs: 0.4,
        aucune: 0.3,
        moments_partages: 0.3,
      }),
      pictogramme: choix("menu_book", {
        menu_book: 0.4,
        aucun: 0.3,
        waving_hand: 0.3,
      }),
      conformite: choix("nuisance_sonore", {
        conforme: 0.5,
        nuisance_sonore: 0.5,
      }),
    };
  if (titre.includes("Bruyante"))
    return {
      ...AUCUN_AVIS,
      conformite: choix("nuisance_sonore", {
        conforme: 0.05,
        nuisance_sonore: 0.95,
      }),
    };
  if (titre.includes("Sans détail"))
    return { ...AUCUN_AVIS, manque_materiel: noul(0.9) };
  return AUCUN_AVIS;
}

const serveur = createServer((requete, reponse) => {
  if (requete.method === "GET" && requete.url === "/sante") {
    reponse.end("ok");
    return;
  }
  if (requete.method === "GET" && requete.url === "/requetes") {
    reponse.setHeader("Content-Type", "application/json");
    reponse.end(JSON.stringify(recues));
    return;
  }
  if (requete.method === "POST" && requete.url === "/systemone") {
    let corps = "";
    requete.on("data", (morceau) => (corps += morceau));
    requete.on("end", () => {
      // L'état de la requête : ce que l'assistant confie à Jev.
      const proposition = JSON.parse(corps).state;
      recues.push(proposition);
      const titre = proposition.titre ?? "";
      if (titre.includes("Panne")) {
        reponse.statusCode = 503;
        reponse.end("indisponible");
        return;
      }
      const repondre = () => {
        reponse.setHeader("Content-Type", "application/json");
        reponse.end(
          JSON.stringify({
            model: "jev-1.13.0",
            answers: reponsesPour(proposition),
            usage: { input_tokens: 0, output_tokens: 0 },
          }),
        );
      };
      // Bien au-delà du délai de l'assistant.
      if (titre.includes("Lent")) setTimeout(repondre, 8000);
      else repondre();
    });
    return;
  }
  reponse.statusCode = 404;
  reponse.end();
});

serveur.listen(port, "127.0.0.1");
