import { describe, expect, it } from "vitest";
import { clientVisiteur } from "./clients";

describe("résidence, vue par un visiteur non connecté", () => {
  it("lit le nom de la résidence", async () => {
    const { data, error } = await clientVisiteur()
      .from("residence")
      .select("nom")
      .single();

    expect(error).toBeNull();
    expect(data?.nom).toBe("Résidence Les Tilleuls");
  });

  it("ne lit pas le code de résidence", async () => {
    const { data, error } = await clientVisiteur()
      .from("residence")
      .select("code")
      .single();

    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});
