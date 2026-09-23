import { lireSession, statutResident } from "@/lib/session";
import { Bientot } from "./bientot";
import { Icone } from "./icone";
import { TitrePage } from "./titre-page";

const etatsBloques = {
  refuse: {
    titre: "Compte non accepté",
    message:
      "Votre compte n'a pas été accepté par le syndic de la résidence. Si vous pensez qu'il s'agit d'une erreur, contactez le syndic.",
  },
  retire: {
    titre: "Accès retiré",
    message:
      "Votre accès à la résidence a été retiré par le syndic, par exemple après un déménagement. Si vous pensez qu'il s'agit d'une erreur, contactez le syndic.",
  },
};

/**
 * Ce que voit un résident selon son statut : la page demandée, précédée d'un bandeau
 * s'il attend la validation du syndic ; seulement un message d'état s'il a été refusé ou retiré.
 */
export async function GardeCompte({ children }: { children: React.ReactNode }) {
  const statut = statutResident(await lireSession());

  if (statut === "refuse" || statut === "retire") {
    const { titre, message } = etatsBloques[statut];
    return (
      <>
        <TitrePage
          titre={titre}
          sousTitre="Votre compte n'a plus accès à la résidence."
        />
        <Bientot icone="block" message={message} />
      </>
    );
  }

  return (
    <>
      {statut === "en_attente" && (
        <section
          aria-label="État de votre compte"
          className="mb-space-lg flex items-start gap-space-sm rounded-lg bg-secondary-container p-space-md text-on-secondary-container"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest">
            <Icone nom="hourglass_top" className="size-7" />
          </span>
          <p className="max-w-[65ch] text-body-lg">
            <strong>Votre compte attend la validation du syndic.</strong> En
            attendant, découvrez les activités et les annonces de la résidence :
            vous pourrez participer dès que votre compte sera validé.
          </p>
        </section>
      )}
      {children}
    </>
  );
}
