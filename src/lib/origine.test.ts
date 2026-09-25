import { describe, expect, it } from "vitest";
import { origineDe } from "./origine";

describe("origine des liens partagés", () => {
  it("en production, le domaine de production, quel que soit l'alias utilisé", () => {
    expect(
      origineDe(
        { hote: "comunity-git-main-equipe.vercel.app", protocole: "https" },
        {
          VERCEL_ENV: "production",
          VERCEL_PROJECT_PRODUCTION_URL: "comunity.example",
        },
      ),
    ).toBe("https://comunity.example");
  });

  it("en production, un en-tête Host falsifié n'y change rien", () => {
    expect(
      origineDe(
        { hote: "piege.example", protocole: "http" },
        {
          VERCEL_ENV: "production",
          VERCEL_PROJECT_PRODUCTION_URL: "comunity.example",
        },
      ),
    ).toBe("https://comunity.example");
  });

  it("sur une preview, le domaine de la preview", () => {
    expect(
      origineDe(
        { hote: "comunity-abc123.vercel.app", protocole: "https" },
        {
          VERCEL_ENV: "preview",
          VERCEL_PROJECT_PRODUCTION_URL: "comunity.example",
        },
      ),
    ).toBe("https://comunity-abc123.vercel.app");
  });

  it("en local, le serveur de la machine en http", () => {
    expect(origineDe({ hote: "127.0.0.1:3100", protocole: null }, {})).toBe(
      "http://127.0.0.1:3100",
    );
    expect(origineDe({ hote: "localhost:3000", protocole: null }, {})).toBe(
      "http://localhost:3000",
    );
  });

  it("ailleurs, https par défaut", () => {
    expect(origineDe({ hote: "comunity.example", protocole: null }, {})).toBe(
      "https://comunity.example",
    );
  });
});
