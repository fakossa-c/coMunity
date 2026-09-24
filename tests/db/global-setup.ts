import type { TestProject } from "vitest/node";
import { lireSupabaseLocal } from "../../scripts/supabase-local.mjs";

declare module "vitest" {
  export interface ProvidedContext {
    supabase: { url: string; cleAnonyme: string; cleSecrete: string };
  }
}

export default function setup(project: TestProject) {
  const { url, cleAnonyme, cleSecrete } = lireSupabaseLocal();
  project.provide("supabase", { url, cleAnonyme, cleSecrete });
}
