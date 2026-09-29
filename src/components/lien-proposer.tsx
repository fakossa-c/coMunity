"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classesBouton } from "./bouton";
import { Icone } from "./icone";

/**
 * Bouton « Proposer » de la barre du haut. Il disparaît sur l'écran Proposer : on ne propose pas
 * depuis Proposer.
 */
export function LienProposer() {
  if (usePathname() === "/proposer") return null;
  return (
    <Link href="/proposer" className={`${classesBouton("action")} px-6`}>
      <Icone nom="add" taille={24} />
      Proposer
    </Link>
  );
}
