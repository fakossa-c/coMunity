import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const chargementClient = vi.hoisted(() => vi.fn());
const uploadToSignedUrl = vi.hoisted(() => vi.fn());

describe("envoyerPhotos", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle");
    uploadToSignedUrl.mockReset();
    chargementClient.mockClear();
    vi.resetModules();
    // La fabrique ne tourne qu'au premier import du module : elle sert de témoin de chargement.
    vi.doMock("@supabase/supabase-js", () => {
      chargementClient();
      return {
        createClient: () => ({
          storage: { from: () => ({ uploadToSignedUrl }) },
        }),
      };
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("ne charge pas le client Supabase tant qu'aucune photo n'est envoyée", async () => {
    await import("./envoi-photos");
    await import("./supabase/navigateur");
    expect(chargementClient).not.toHaveBeenCalled();
  });

  it("charge le client à l'envoi et rend le chemin de chaque photo déposée", async () => {
    uploadToSignedUrl.mockResolvedValue({ error: null });
    const { envoyerPhotos } = await import("./envoi-photos");
    const photo = new Blob(["a"], { type: "image/jpeg" });

    const chemins = await envoyerPhotos(
      [{ chemin: "act/1.jpg", token: "t1" }],
      [photo],
    );

    expect(chemins).toEqual(["act/1.jpg"]);
    expect(chargementClient).toHaveBeenCalledTimes(1);
    expect(uploadToSignedUrl).toHaveBeenCalledWith("act/1.jpg", "t1", photo, {
      contentType: "image/jpeg",
    });
  });

  it("rend null pour une photo sans dépôt ou dont l'envoi échoue", async () => {
    uploadToSignedUrl.mockResolvedValue({ error: new Error("refusé") });
    const { envoyerPhotos } = await import("./envoi-photos");
    const photo = new Blob(["a"], { type: "image/jpeg" });

    expect(
      await envoyerPhotos(
        [{ chemin: "act/1.jpg", token: "t1" }],
        [photo, photo],
      ),
    ).toEqual([null, null]);
  });

  it("rend null pour chaque photo quand le client ne se charge pas", async () => {
    vi.doMock("@supabase/supabase-js", () => {
      throw new Error("réseau coupé");
    });
    const { envoyerPhotos } = await import("./envoi-photos");
    const photo = new Blob(["a"], { type: "image/jpeg" });

    expect(
      await envoyerPhotos([{ chemin: "act/1.jpg", token: "t1" }], [photo]),
    ).toEqual([null]);
  });
});

describe("deposerFichier", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:1");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "cle");
    uploadToSignedUrl.mockReset();
    vi.resetModules();
    vi.doMock("@supabase/supabase-js", () => ({
      createClient: () => ({
        storage: { from: () => ({ uploadToSignedUrl }) },
      }),
    }));
  });
  afterEach(() => vi.unstubAllEnvs());

  const fichier = new File(["a"], "plan.pdf", { type: "application/pdf" });
  const depot = { chemin: "annonces/1.pdf", token: "t1" };

  it("dépose le fichier avec son jeton et rend true", async () => {
    uploadToSignedUrl.mockResolvedValue({ error: null });
    const { deposerFichier } = await import("./envoi-photos");

    expect(await deposerFichier("annonces", depot, fichier)).toBe(true);
    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      "annonces/1.pdf",
      "t1",
      fichier,
      { contentType: "application/pdf" },
    );
  });

  it("rend false quand le dépôt est refusé", async () => {
    uploadToSignedUrl.mockResolvedValue({ error: new Error("refusé") });
    const { deposerFichier } = await import("./envoi-photos");

    expect(await deposerFichier("annonces", depot, fichier)).toBe(false);
  });

  it("rend false, sans lever, quand le client ne se charge pas", async () => {
    vi.doMock("@supabase/supabase-js", () => {
      throw new Error("réseau coupé");
    });
    const { deposerFichier } = await import("./envoi-photos");

    expect(await deposerFichier("annonces", depot, fichier)).toBe(false);
  });
});
