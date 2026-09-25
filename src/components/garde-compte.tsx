import { redirect } from "next/navigation";
import {
  CHEMIN_COMPLETION,
  doitCompleterProfil,
  lireSession,
  statutResident,
} from "@/lib/session";
import { Bientot } from "./bientot";
import { Icone } from "./icone";
import { TitrePage } from "./titre-page";

const etatsBloques = {
  refuse: {
    titre: "Compte non accepté",
    sousTitre: "Votre inscription n'a pas été retenue.",
    message:
      "Votre compte n'a pas été accepté par le syndic de la résidence. Si vous pensez qu'il s'agit d'une erreur, contactez le syndic.",
  },
  retire: {
    titre: "Accès retiré",
    sousTitre: "Votre compte n'a plus accès à la résidence.",
    message:
      "Votre accès à la résidence a été retiré par le syndic, par exemple après un déménagement. Si vous pensez qu'il s'agit d'une erreur, contactez le syndic.",
  },
};

/** Vrai pour un résident refusé ou retiré, qui ne voit plus que son message d'état. */
async function compteBloque() {
  const statut = statutResident(await lireSession());
  return statut === "refuse" || statut === "retire";
}

/** N'affiche `children` (la navigation, par exemple) qu'à un compte qui n'est pas bloqué. */
export async function SiCompteOuvert({
  children,
}: {
  children: React.ReactNode;
}) {
  return (await compteBloque()) ? null : children;
}

/**
 * Ce que voit un résident selon son statut : la page demandée, précédée d'un bandeau
 * s'il attend la validation du syndic ; seulement un message d'état s'il a été refusé ou retiré.
 * Un membre du syndic sans prénom ni nom est d'abord conduit à l'écran qui les demande, sauf
 * sur les écrans où il les saisit (`completionExigee` à faux).
 */
export async function GardeCompte({
  completionExigee = true,
  children,
}: {
  completionExigee?: boolean;
  children: React.ReactNode;
}) {
  const session = await lireSession();
  if (completionExigee && doitCompleterProfil(session)) {
    redirect(CHEMIN_COMPLETION);
  }
  const statut = statutResident(session);

  if (statut === "refuse" || statut === "retire") {
    const { titre, sousTitre, message } = etatsBloques[statut];
    return (
      <>
        <TitrePage titre={titre} sousTitre={sousTitre} />
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
