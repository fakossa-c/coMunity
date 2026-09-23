import type { Metadata } from "next";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic } from "../acces";
import { CodeResidence } from "./code-residence";

export const metadata: Metadata = { title: "Code de la résidence" };

export default async function PageCodeResidence() {
  const { refus } = await accesSyndic("/syndic/code-residence");
  if (refus) return refus;

  const supabase = await clientSession();
  const { data: code, error } = await supabase.rpc("lire_code_residence");
  if (error) throw new Error(`Code de résidence illisible : ${error.message}`);

  return (
    <>
      <TitrePage
        titre="Code de la résidence"
        sousTitre="Les résidents le saisissent pour créer leur compte. Partagez-le, par exemple dans le groupe WhatsApp de la résidence."
      />
      <CodeResidence code={code} />
    </>
  );
}
