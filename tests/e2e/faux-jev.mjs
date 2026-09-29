// Faux OpenRouter pour les tests de bout en bout : répond à la place de Jev selon le titre de la
// proposition, et garde ce qu'il a reçu (GET /requetes) pour vérifier ce qui part vers Jev.
// Lancé par playwright.config.ts : `node tests/e2e/faux-jev.mjs <port>`.
import { createServer } from "node:http";

const port = Number(process.argv[2]);
const recues = [];

const AUCUN_AVIS = {
  categorie: null,
  pictogramme: null,
  informations_manquantes: [],
  conformite: null,
};

/** L'avis de Jev sur une proposition : le titre dit quel cas jouer. */
function avisPour(proposition) {
  const titre = proposition.titre ?? "";
  if (titre.includes("Bricolage"))
    return {
      ...AUCUN_AVIS,
      categorie: { valeur: "creation_bricolage", confiance: 0.9 },
      pictogramme: { valeur: "kitchen", confiance: 0.85 },
      conformite: { conforme: true, raison: "", confiance: 0.95 },
    };
  if (titre.includes("Incertain"))
    return {
      ...AUCUN_AVIS,
      categorie: { valeur: "culture_loisirs", confiance: 0.4 },
      pictogramme: { valeur: "menu_book", confiance: 0.4 },
      conformite: { conforme: false, raison: "Peut-être.", confiance: 0.5 },
    };
  if (titre.includes("Bruyante"))
    return {
      ...AUCUN_AVIS,
      conformite: {
        conforme: false,
        raison: "Une soirée bruyante jusque tard dans la nuit.",
        confiance: 0.95,
      },
    };
  if (titre.includes("Sans détail"))
    return {
      ...AUCUN_AVIS,
      informations_manquantes: ["Précisez ce qu'il faut apporter."],
    };
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
  if (requete.method === "POST" && requete.url === "/chat/completions") {
    let corps = "";
    requete.on("data", (morceau) => (corps += morceau));
    requete.on("end", () => {
      const message = JSON.parse(corps).messages.find((m) => m.role === "user");
      const proposition = JSON.parse(message.content);
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
            choices: [
              { message: { content: JSON.stringify(avisPour(proposition)) } },
            ],
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
