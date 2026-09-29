import { describe, expect, it } from "vitest";
import type { EntreeJev } from "@/assistant";
import { moteurJevDepuis } from "@/assistant/jev-openrouter";

const entree: EntreeJev = {
  titre: "Atelier tricot",
  description: "On tricote ensemble, débutants bienvenus.",
  date: "2026-10-24",
  heureDebut: "16:00",
  heureFin: "18:00",
};

/** La réponse d'OpenRouter dont le message de Jev est `contenu`. */
function reponseOpenRouter(contenu: string, statut = 200) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: contenu } }] }),
    { status: statut },
  );
}

const reponseSure = {
  categorie: { valeur: "creation_bricolage", confiance: 0.92 },
  pictogramme: { valeur: "handyman", confiance: 0.7 },
  informations_manquantes: ["Faut-il apporter ses aiguilles ?"],
  conformite: { conforme: true, raison: "", confiance: 0.97 },
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

describe("moteur Jev par OpenRouter", () => {
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
    it("interroge le modèle Jev d'OpenRouter avec la clé", async () => {
      const { impl, appels } = fauxFetch(() =>
        reponseOpenRouter(JSON.stringify(reponseSure)),
      );
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);

      await moteur!(entree, new AbortController().signal);

      expect(appels).toHaveLength(1);
      expect(appels[0].url).toBe(
        "https://openrouter.ai/api/v1/chat/completions",
      );
      expect(appels[0].init.method).toBe("POST");
      expect(appels[0].init.headers).toMatchObject({
        Authorization: "Bearer cle",
      });
      expect(JSON.parse(appels[0].init.body as string).model).toBe(
        "typesafe/jev-1.13",
      );
    });

    it("prend l'adresse d'OpenRouter dans la configuration quand elle y est", async () => {
      const { impl, appels } = fauxFetch(() =>
        reponseOpenRouter(JSON.stringify(reponseSure)),
      );
      const moteur = moteurJevDepuis(
        {
          OPENROUTER_API_KEY: "cle",
          OPENROUTER_BASE_URL: "http://127.0.0.1:4100/",
        },
        impl,
      );

      await moteur!(entree, new AbortController().signal);

      expect(appels[0].url).toBe("http://127.0.0.1:4100/chat/completions");
    });

    it("n'envoie que le titre, la description et le créneau", async () => {
      const { impl, appels } = fauxFetch(() =>
        reponseOpenRouter(JSON.stringify(reponseSure)),
      );
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);

      await moteur!(entree, new AbortController().signal);

      const { messages } = JSON.parse(appels[0].init.body as string);
      const utilisateur = messages.filter(
        (m: { role: string }) => m.role === "user",
      );
      expect(utilisateur).toHaveLength(1);
      expect(JSON.parse(utilisateur[0].content)).toEqual(entree);
    });

    it("transmet la coupure à la requête", async () => {
      const { impl, appels } = fauxFetch(() =>
        reponseOpenRouter(JSON.stringify(reponseSure)),
      );
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);
      const coupure = new AbortController();

      await moteur!(entree, coupure.signal);

      expect(appels[0].init.signal).toBe(coupure.signal);
    });
  });

  describe("réponse", () => {
    it("lit l'avis de Jev", async () => {
      const { impl } = fauxFetch(() =>
        reponseOpenRouter(JSON.stringify(reponseSure)),
      );
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);

      const reponse = await moteur!(entree, new AbortController().signal);

      expect(reponse).toEqual({
        categorie: { valeur: "creation_bricolage", confiance: 0.92 },
        pictogramme: { valeur: "handyman", confiance: 0.7 },
        informationsManquantes: ["Faut-il apporter ses aiguilles ?"],
        conformite: { conforme: true, raison: "", confiance: 0.97 },
      });
    });

    it("lit un avis rendu dans un bloc de code", async () => {
      const { impl } = fauxFetch(() =>
        reponseOpenRouter("```json\n" + JSON.stringify(reponseSure) + "\n```"),
      );
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);

      const reponse = await moteur!(entree, new AbortController().signal);

      expect(reponse.categorie?.valeur).toBe("creation_bricolage");
    });

    it("tient pour absent ce que Jev ne dit pas", async () => {
      const { impl } = fauxFetch(() => reponseOpenRouter("{}"));
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);

      const reponse = await moteur!(entree, new AbortController().signal);

      expect(reponse).toEqual({
        categorie: null,
        pictogramme: null,
        informationsManquantes: [],
        conformite: null,
      });
    });

    it("échoue sur une erreur d'OpenRouter", async () => {
      const { impl } = fauxFetch(() => reponseOpenRouter("", 503));
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);

      await expect(
        moteur!(entree, new AbortController().signal),
      ).rejects.toThrow();
    });

    it("échoue sur une réponse qui n'est pas un avis", async () => {
      const { impl } = fauxFetch(() =>
        reponseOpenRouter("Désolé, je ne peux pas répondre."),
      );
      const moteur = moteurJevDepuis({ OPENROUTER_API_KEY: "cle" }, impl);

      await expect(
        moteur!(entree, new AbortController().signal),
      ).rejects.toThrow();
    });
  });
});
