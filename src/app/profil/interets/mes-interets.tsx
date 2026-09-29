"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Bouton } from "@/components/bouton";
import { Champ } from "@/components/champ";
import { Icone } from "@/components/icone";
import {
  LONGUEUR_MAXIMALE_INTERET,
  refusInteret,
  type CentreInteret,
} from "@/lib/centres-interet";
import type { Resultat } from "@/lib/resultat";
import { ajouterInteret, modifierInteret, supprimerInteret } from "./actions";

/** Mes intérêts : ajouter, modifier et supprimer ses centres d'intérêt. */
export function MesInterets({ interets }: { interets: CentreInteret[] }) {
  const [nouveau, setNouveau] = useState("");
  const [erreurAjout, setErreurAjout] = useState<string>();
  const [enModification, setEnModification] = useState<string | null>(null);
  const [saisie, setSaisie] = useState("");
  const [erreurModification, setErreurModification] = useState<string>();
  const [annonce, setAnnonce] = useState("");
  const [enCours, demarrer] = useTransition();

  function ajouter(e: FormEvent) {
    e.preventDefault();
    const refus = refusInteret(nouveau, interets);
    setErreurAjout(refus ?? undefined);
    if (refus) return;
    demarrer(async () => {
      const resultat = await ajouterInteret(nouveau);
      if (resultat.ok) {
        setNouveau("");
        setAnnonce(resultat.message);
      } else setErreurAjout(resultat.message);
    });
  }

  function modifier(e: FormEvent, id: string) {
    e.preventDefault();
    const refus = refusInteret(saisie, interets, id);
    setErreurModification(refus ?? undefined);
    if (refus) return;
    demarrer(async () => {
      const resultat = await modifierInteret(id, saisie);
      if (resultat.ok) {
        setEnModification(null);
        setAnnonce(resultat.message);
      } else setErreurModification(resultat.message);
    });
  }

  function supprimer(id: string) {
    demarrer(async () => {
      const resultat: Resultat = await supprimerInteret(id);
      setAnnonce(resultat.message);
      if (enModification === id) setEnModification(null);
    });
  }

  return (
    <div className="flex flex-col gap-bloc">
      <form
        onSubmit={ajouter}
        noValidate
        className="flex flex-col gap-space-sm"
      >
        <Champ
          libelle="Nouveau centre d'intérêt"
          name="interet"
          autoComplete="off"
          maxLength={LONGUEUR_MAXIMALE_INTERET}
          value={nouveau}
          onChange={(e) => setNouveau(e.target.value)}
          erreur={erreurAjout}
        />
        <div>
          <Bouton type="submit" icone="add" disabled={enCours}>
            Ajouter
          </Bouton>
        </div>
      </form>

      <div role="status" className="sr-only">
        {annonce}
      </div>

      {interets.length === 0 ? (
        <p className="text-body-lg text-on-surface-variant">
          Vous n&apos;avez encore déclaré aucun centre d&apos;intérêt.
        </p>
      ) : (
        <ul
          aria-label="Vos centres d'intérêt"
          className="flex flex-col divide-y-[1.5px] divide-bordure-carte rounded-lg border-[1.5px] border-bordure-carte bg-fond-carte"
        >
          {interets.map((interet) => (
            <li
              key={interet.id}
              className="flex min-h-ligne items-center gap-space-sm px-4 py-2"
            >
              <span className="text-on-surface-variant">
                <Icone nom="interests" taille={24} />
              </span>
              {enModification === interet.id ? (
                <form
                  onSubmit={(e) => modifier(e, interet.id)}
                  noValidate
                  className="flex min-w-0 flex-1 flex-col gap-space-sm py-2"
                >
                  <Champ
                    libelle="Centre d'intérêt"
                    name="libelle"
                    autoComplete="off"
                    maxLength={LONGUEUR_MAXIMALE_INTERET}
                    value={saisie}
                    onChange={(e) => setSaisie(e.target.value)}
                    erreur={erreurModification}
                  />
                  <div className="flex flex-wrap gap-space-sm">
                    <Bouton type="submit" disabled={enCours}>
                      Enregistrer
                    </Bouton>
                    <Bouton
                      variante="contour"
                      disabled={enCours}
                      onClick={() => setEnModification(null)}
                    >
                      Annuler
                    </Bouton>
                  </div>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 font-headline text-label-lg [overflow-wrap:anywhere] text-on-surface">
                    {interet.libelle}
                  </span>
                  <Bouton
                    variante="fantome"
                    aria-label={`Modifier ${interet.libelle}`}
                    disabled={enCours}
                    onClick={() => {
                      setEnModification(interet.id);
                      setSaisie(interet.libelle);
                      setErreurModification(undefined);
                    }}
                  >
                    Modifier
                  </Bouton>
                  <Bouton
                    variante="fantome"
                    aria-label={`Supprimer ${interet.libelle}`}
                    disabled={enCours}
                    onClick={() => supprimer(interet.id)}
                    className="text-error"
                  >
                    Supprimer
                  </Bouton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
