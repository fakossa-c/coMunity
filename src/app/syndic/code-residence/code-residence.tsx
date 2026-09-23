"use client";

import { useState, useTransition } from "react";
import { Annonce, Bouton } from "@/components/formulaire";
import { Icone } from "@/components/icone";
import type { Resultat } from "../resultat";
import { regenererCode } from "./actions";

export function CodeResidence({ code }: { code: string }) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, demarrer] = useTransition();

  function regenerer() {
    demarrer(async () => {
      setResultat(await regenererCode());
      setConfirmation(false);
    });
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(code);
      setResultat({ ok: true, message: `Code ${code} copié.` });
    } catch {
      setResultat({
        ok: false,
        message:
          "La copie n'a pas fonctionné : sélectionnez le code à la main.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-space-lg">
      {/* Un seul bloc : vides, les deux zones n'ajoutent qu'un espacement. */}
      <div>
        <Annonce message={resultat?.ok && resultat.message} />
        <Annonce message={resultat?.ok === false && resultat.message} erreur />
      </div>

      <section
        aria-labelledby="titre-code"
        className="flex flex-col gap-space-md rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)]"
      >
        <h2 id="titre-code" className="font-headline text-headline-sm">
          Code en vigueur
        </h2>
        <p className="font-headline text-headline-xl tracking-widest break-all text-on-surface select-all">
          {code}
        </p>
        <Bouton variante="contour" onClick={copier} className="self-start">
          Copier le code
        </Bouton>
      </section>

      <section
        aria-labelledby="titre-regenerer"
        className="flex flex-col gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)]"
      >
        <h2 id="titre-regenerer" className="font-headline text-headline-sm">
          Le code a circulé trop loin ?
        </h2>
        <p className="max-w-[65ch] text-body-lg">
          Régénérez-le : l&apos;ancien code ne permettra plus de créer un
          compte. Les résidents déjà inscrits ne sont pas concernés.
        </p>
        <span className="flex flex-wrap gap-space-sm">
          {confirmation ? (
            <>
              <Bouton
                variante="danger"
                onClick={regenerer}
                disabled={enCours}
                autoFocus
              >
                {enCours ? "Régénération…" : "Confirmer : remplacer le code"}
              </Bouton>
              <Bouton
                variante="contour"
                onClick={() => setConfirmation(false)}
                disabled={enCours}
              >
                Annuler
              </Bouton>
            </>
          ) : (
            <Bouton variante="contour" onClick={() => setConfirmation(true)}>
              <Icone nom="refresh" className="size-6" />
              Régénérer le code
            </Bouton>
          )}
        </span>
      </section>
    </div>
  );
}
