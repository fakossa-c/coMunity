"use client";

import { useState, useTransition } from "react";
import { BoutonVisibilite } from "@/components/bouton-visibilite";
import { CarteLignes } from "@/components/carte-lignes";
import { EncartPastel } from "@/components/encart-pastel";
import { libelleEtage, resumeVisibilite } from "@/lib/informations-profil";
import { choisirVisibilite, type ChampVisible } from "./actions";

type Props = {
  pseudo: string;
  telephone: string | null;
  batiment: string | null;
  etage: number | null;
  visibilites: Record<ChampVisible, boolean>;
};

const NON_RENSEIGNE = "Non renseigné";

/**
 * Ce que les voisins voient de la personne : le pseudo, toujours, et le téléphone, le bâtiment et
 * l'étage qu'elle rend visibles. Le choix s'applique tout de suite à la phrase de l'encart (avant
 * même la réponse du serveur) et est enregistré sur le profil en arrière-plan.
 */
export function InformationsVisibles({
  pseudo,
  telephone,
  batiment,
  etage,
  visibilites: initiales,
}: Props) {
  const [visibilites, setVisibilites] = useState(initiales);
  const [erreur, setErreur] = useState<string | null>(null);
  const [, demarrer] = useTransition();

  function basculer(champ: ChampVisible) {
    const visible = !visibilites[champ];
    setVisibilites((v) => ({ ...v, [champ]: visible }));
    setErreur(null);
    demarrer(async () => {
      const resultat = await choisirVisibilite(champ, visible);
      if (!resultat.ok) {
        setVisibilites((v) => ({ ...v, [champ]: !visible }));
        setErreur(resultat.message);
      }
    });
  }

  const ligne = (
    champ: ChampVisible,
    icone: "call" | "apartment",
    titre: string,
    valeur: string | null,
  ) => ({
    cle: champ,
    icone,
    titre,
    detail: valeur ?? NON_RENSEIGNE,
    fin: (
      <BoutonVisibilite
        libelle={titre}
        visible={visibilites[champ]}
        onClick={() => basculer(champ)}
      />
    ),
  });

  return (
    <>
      <div aria-live="polite">
        <EncartPastel>
          {resumeVisibilite({
            telephone: {
              visible: visibilites.telephone,
              renseigne: telephone !== null,
            },
            batiment: {
              visible: visibilites.batiment,
              renseigne: batiment !== null,
            },
            etage: {
              visible: visibilites.etage,
              renseigne: etage !== null,
            },
          })}
        </EncartPastel>
      </div>
      <CarteLignes
        libelle="Ce que voient vos voisins"
        lignes={[
          {
            cle: "pseudo",
            icone: "alternate_email",
            titre: "Pseudo",
            detail: pseudo,
            fin: <BoutonVisibilite libelle="Pseudo" visible verrou />,
          },
          ligne("telephone", "call", "Téléphone", telephone),
          ligne("batiment", "apartment", "Bâtiment", batiment),
          ligne(
            "etage",
            "apartment",
            "Étage",
            etage === null ? null : libelleEtage(etage),
          ),
        ]}
      />
      {erreur && (
        <p role="alert" className="text-body-md text-error">
          {erreur}
        </p>
      )}
    </>
  );
}
