import { describe, expect, it } from "vitest";
import type { EntreeJev } from "@/assistant";
import { moteurJevDepuis } from "@/assistant/jev-openrouter";
import {
  categoriesActiviteListe,
  pictogrammesActivite,
} from "@/lib/categories-activite";

const entree: EntreeJev = {
  titre: "Atelier tricot",
  description: "On tricote ensemble, débutants bienvenus.",
  date: "2026-10-24",
  heureDebut: "16:00",
  heureFin: "18:00",
};

/** Une réponse de l'API systemone : `answers` tel que Jev le rend, plus l'usage. */
function reponseSystemOne(answers: unknown, statut = 200) {
  return new Response(
    JSON.stringify({
      id: "req-1",
      model: "jev-1.13.0",
      provider: "TypeSafe",
      answers,
      usage: { input_tokens: 360, output_tokens: 39, cost: 0.0001 },
    }),
    { status: statut },
  );
}

const choix = (
  choice: string,
  probabilities: Record<string, number>,
  confidence: number,
) => ({ type: "choice", choice, probabilities, confidence });

const noul = (valeur: number) => ({ type: "noul", noul: valeur });

/** Les réponses d'un Jev sûr : tricot, conforme, rien ne manque. */
const reponseSure = {
  categorie: choix(
    "creation_bricolage",
    { creation_bricolage: 0.92, culture_loisirs: 0.08 },
    0.92,
  ),
  pictogramme: choix("handyman", { handyman: 0.7, interests: 0.3 }, 0.7),
  conformite: choix(
    "conforme",
    { conforme: 0.97, nuisance_sonore: 0.03 },
    0.97,
  ),
  manque_materiel: noul(0.1),
  manque_public: noul(0.05),
  manque_deroulement: noul(0.02),
};

/** Un `fetch` qui répond `reponse` et garde la requête reçue. */
function fauxFetch(reponse: () => Response) {
  const appels: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    appels.push({ url, init });
    return reponse();
  }) as unknown as typeof fetch;
  return { impl, appels };
}

/** Le moteur configuré avec `reponse`, et ce qu'il a envoyé. */
function moteurAvec(reponse: () => Response) {
  const { impl, appels } = fauxFetch(reponse);
  const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl)!;
  const interroger = () => moteur(entree, new AbortController().signal);
  const corps = () => JSON.parse(appels[0].init.body as string);
  return { moteur, interroger, appels, corps };
}

describe("moteur Jev par OpenRouter (API systemone)", () => {
  describe("configuration", () => {
    it("n'existe pas sans clé", () => {
      expect(moteurJevDepuis({})).toBeUndefined();
      expect(moteurJevDepuis({ OPENROUTER_API_KEY: "" })).toBeUndefined();
      expect(moteurJevDepuis({ OPENROUTER_API_KEY: "  " })).toBeUndefined();
    });

    it("existe avec une clé", () => {
      expect(moteurJevDepuis({ OPENROUTER_API_KEY: "cle" })).toBeTypeOf(
        "function",
      );
    });
  });

  describe("requête", () => {
    it("interroge systemone d'OpenRouter, modèle jev-1.13, avec la clé", async () => {
      const { interroger, appels, corps } = moteurAvec(() =>
        reponseSystemOne(reponseSure),
      );

      await interroger();

      expect(appels).toHaveLength(1);
      expect(appels[0].url).toBe("https://openrouter.ai/api/v1/systemone");
      expect(appels[0].init.method).toBe("POST");
      expect(appels[0].init.headers).toMatchObject({
        Authorization: "Bearer cle",
      });
      expect(corps().model).toBe("jev-1.13");
    });

    it("prend l'adresse d'OpenRouter dans la configuration quand elle y est", async () => {
      const { impl, appels } = fauxFetch(() => reponseSystemOne(reponseSure));
      const moteur = moteurJevDepuis(
        {
          OPENROUTER_API_KEY: "cle",
          OPENROUTER_BASE_URL: "http://127.0.0.1:4100/",
        },
        impl,
      );

      await moteur!(entree, new AbortController().signal);

      expect(appels[0].url).toBe("http://127.0.0.1:4100/systemone");
    });

    it("n'envoie que le titre, la description et le créneau, dans l'état", async () => {
      const { interroger, corps } = moteurAvec(() =>
        reponseSystemOne(reponseSure),
      );

      await interroger();

      expect(corps().state).toEqual(entree);
    });

    it("pose les six questions, chacune avec son type et ses instructions", async () => {
      const { interroger, corps } = moteurAvec(() =>
        reponseSystemOne(reponseSure),
      );

      await interroger();

      const { questions } = corps();
      expect(Object.keys(questions)).toEqual([
        "categorie",
        "pictogramme",
        "conformite",
        "manque_materiel",
        "manque_public",
        "manque_deroulement",
      ]);
      expect(
        Object.values<{ type: string; instructions: string }>(questions).map(
          (q) => q.type,
        ),
      ).toEqual(["choice", "choice", "choice", "noul", "noul", "noul"]);
      for (const question of Object.values<{ instructions: string }>(questions))
        expect(question.instructions.length).toBeGreaterThan(20);
    });

    it("offre chaque catégorie et chaque pictogramme connus, plus « aucune » et « aucun »", async () => {
      const { interroger, corps } = moteurAvec(() =>
        reponseSystemOne(reponseSure),
      );

      await interroger();

      const { questions } = corps();
      expect(Object.keys(questions.categorie.criteria)).toEqual([
        ...categoriesActiviteListe,
        "aucune",
      ]);
      expect(Object.keys(questions.pictogramme.criteria)).toEqual([
        ...pictogrammesActivite,
        "aucun",
      ]);
      expect(Object.keys(questions.conformite.criteria)[0]).toBe("conforme");
    });

    it("transmet la coupure à la requête", async () => {
      const { impl, appels } = fauxFetch(() => reponseSystemOne(reponseSure));
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);
      const coupure = new AbortController();

      await moteur!(entree, coupure.signal);

      expect(appels[0].init.signal).toBe(coupure.signal);
    });
  });

  describe("réponse", () => {
    it("lit la catégorie, le pictogramme et la conformité de Jev", async () => {
      const { interroger } = moteurAvec(() => reponseSystemOne(reponseSure));

      expect(await interroger()).toEqual({
        categorie: { valeur: "creation_bricolage", confiance: 0.92 },
        pictogramme: { valeur: "handyman", confiance: 0.7 },
        informationsManquantes: [],
        conformite: { conforme: true, raison: "", confiance: 0.97 },
      });
    });

    it("traduit une non-conformité en raison pour le conseil syndical, avec la probabilité de violation", async () => {
      const { interroger } = moteurAvec(() =>
        reponseSystemOne({
          ...reponseSure,
          conformite: choix(
            "nuisance_sonore",
            { conforme: 0.05, nuisance_sonore: 0.85, commerce: 0.1 },
            0.85,
          ),
        }),
      );

      const { conformite } = await interroger();

      expect(conformite).toEqual({
        conforme: false,
        raison: "Nuisances sonores : l'activité risque de gêner le voisinage.",
        confiance: 0.95,
      });
    });

    it("une violation certaine mais partagée entre deux motifs reste une violation sûre", async () => {
      const { interroger } = moteurAvec(() =>
        reponseSystemOne({
          ...reponseSure,
          conformite: choix(
            "commerce",
            { conforme: 0.1, nuisance_sonore: 0.45, commerce: 0.45 },
            0.4,
          ),
        }),
      );

      const { conformite } = await interroger();

      expect(conformite?.conforme).toBe(false);
      expect(conformite?.confiance).toBeCloseTo(0.9);
      expect(conformite?.raison).toBe(
        "Nuisances sonores : l'activité risque de gêner le voisinage.",
      );
    });

    it("signale par une phrase ce qui semble manquer, à partir de 0,6", async () => {
      const { interroger } = moteurAvec(() =>
        reponseSystemOne({
          ...reponseSure,
          manque_materiel: noul(0.9),
          manque_public: noul(0.59),
          manque_deroulement: noul(0.6),
        }),
      );

      const { informationsManquantes } = await interroger();

      expect(informationsManquantes).toEqual([
        "Précisez ce que chacun doit apporter, ou ce que vous fournissez.",
        "Dites en une phrase ce que l'on y fait.",
      ]);
    });

    it("tient pour absent ce que Jev ne dit pas", async () => {
      const { interroger } = moteurAvec(() => reponseSystemOne({}));

      expect(await interroger()).toEqual({
        categorie: null,
        pictogramme: null,
        informationsManquantes: [],
        conformite: null,
      });
    });

    it.each([401, 402, 422, 429, 500, 503, 529])(
      "échoue sur le statut %i d'OpenRouter, pour que l'assistant se passe de Jev",
      async (statut) => {
        const { interroger } = moteurAvec(() => reponseSystemOne({}, statut));

        await expect(interroger()).rejects.toThrow(String(statut));
      },
    );

    it("échoue sur une réponse qui n'est pas du JSON", async () => {
      const { interroger } = moteurAvec(
        () => new Response("Bad gateway", { status: 200 }),
      );

      await expect(interroger()).rejects.toThrow();
    });

    it("échoue sur une réponse sans answers", async () => {
      const { interroger } = moteurAvec(
        () => new Response(JSON.stringify({ model: "jev-1.13.0" })),
      );

      await expect(interroger()).rejects.toThrow();
    });
  });
});
