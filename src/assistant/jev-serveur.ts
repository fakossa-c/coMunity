import "server-only";
import type { MoteurJev } from "@/assistant";
import { moteurJevDepuis } from "./jev-openrouter";

/**
 * Le moteur Jev, ou `undefined` quand aucune clé n'est configurée. Réservé au serveur : la clé
 * d'OpenRouter ne descend jamais dans le navigateur.
 */
export function moteurJev(): MoteurJev | undefined {
  return moteurJevDepuis(process.env);
}
