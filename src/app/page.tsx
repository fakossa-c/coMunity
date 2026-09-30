import { AideInstallation } from "@/components/aide-installation";
import { BarreFiltres } from "@/components/barre-filtres";
import { Bientot } from "@/components/bientot";
import { EcranPrincipal } from "@/components/cadre";
import {
  CarteActivite,
  type ActiviteDuJour,
} from "@/components/carte-activite";
import { PuceFiltre } from "@/components/puce-filtre";
import { Salutation } from "@/components/salutation";
import { TitreSection } from "@/components/titre-section";
import { activiteALaUne } from "@/lib/a-la-une";
import {
  activitesDeLaSemaine,
  categorieFiltree,
  grouperParJour,
  resumeSemaine,
} from "@/lib/accueil";
import {
  categoriesActivite,
  categoriesActiviteListe,
  pictogrammeDe,
  type CategorieActivite,
} from "@/lib/categories-activite";
import { aujourdhui as jourDeReference } from "@/lib/partage-activite";
import { lireSession } from "@/lib/session";
import { clientSession } from "@/lib/supabase/serveur";

const MESSAGE_VIDE =
  "Aucune activité prévue pour l'instant. Lancez la première avec « Proposer ».";

type Props = { searchParams: Promise<{ categorie?: string }> };

export default async function Accueil({ searchParams }: Props) {
  const { categorie } = await searchParams;
  const session = await lireSession();
  const supabase = await clientSession();
  const { data: peutConsulter } = await supabase.rpc("peut_consulter");
  const activites = peutConsulter ? await lireCatalogue() : [];
  const aujourdhui = jourDeReference();

  return (
    <EcranPrincipal onglet="accueil">
      <Salutation
        prenom={session?.prenom}
        resume={
          peutConsulter
            ? resumeSemaine(activitesDeLaSemaine(activites, aujourdhui))
            : undefined
        }
      />
      <AideInstallation />
      {activites.length === 0 ? (
        <Bientot icone="diversity_3" message={MESSAGE_VIDE} />
      ) : (
        <Catalogue
          activites={activites}
          categorie={categorieFiltree(categorie)}
          aujourdhui={aujourdhui}
        />
      )}
    </EcranPrincipal>
  );
}

/** Les activités à venir : le catalogue donne aussi leur heure de fin, et retire celles qui sont finies. */
async function lireCatalogue() {
  const supabase = await clientSession();
  const { data, error } = await supabase.rpc("catalogue_activites");
  if (error)
    throw new Error(`Catalogue des activités illisible : ${error.message}`);
  return data as ActiviteDuJour[];
}

function Catalogue({
  activites,
  categorie,
  aujourdhui,
}: {
  activites: ActiviteDuJour[];
  categorie: CategorieActivite | null;
  aujourdhui: string;
}) {
  const visibles = categorie
    ? activites.filter((activite) => activite.categorie === categorie)
    : activites;
  // « À la une » suit le filtre de catégorie, et sa carte ne se répète pas dans la grille.
  const aLaUne = activiteALaUne(visibles);
  const jours = grouperParJour(
    visibles.filter((activite) => activite.id !== aLaUne?.id),
    aujourdhui,
  );

  return (
    <>
      <BarreFiltres libelle="Catégories">
        <PuceFiltre categorie selectionnee={categorie === null} href="/">
          Toutes
        </PuceFiltre>
        {categoriesActiviteListe.map((cle) => (
          <PuceFiltre
            key={cle}
            categorie
            icone={pictogrammeDe(cle)}
            selectionnee={categorie === cle}
            href={`/?categorie=${cle}`}
          >
            {categoriesActivite[cle].libelle}
          </PuceFiltre>
        ))}
      </BarreFiltres>
      {aLaUne && (
        <section aria-label="À la une" className="mt-space-sm">
          <CarteActivite activite={aLaUne} aLaUne />
        </section>
      )}
      {/* Seule « À la une » reste dans la catégorie : rien à ajouter dessous. */}
      {(jours.length > 0 || !aLaUne) && (
        <section
          aria-label="Activités à venir"
          className="mt-space-sm flex flex-col gap-space-lg desktop:mt-9"
        >
          {jours.length === 0 ? (
            <Bientot
              icone="diversity_3"
              message="Aucune activité à venir dans cette catégorie. Choisissez « Toutes » pour voir les autres."
            />
          ) : (
            jours.map((jour) => (
              <section
                key={jour.date}
                aria-labelledby={`jour-${jour.date}`}
                className="flex flex-col gap-3.5"
              >
                <TitreSection id={`jour-${jour.date}`} accent={jour.aujourdhui}>
                  {jour.titre}
                </TitreSection>
                <ul className="grid items-start gap-bloc desktop:grid-cols-3 desktop:gap-x-8 desktop:gap-y-6">
                  {jour.activites.map((activite) => (
                    <li key={activite.id}>
                      <CarteActivite activite={activite} detailsDepliables />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </section>
      )}
    </>
  );
}
