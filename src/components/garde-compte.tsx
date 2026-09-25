import { redirect } from "next/navigation";
import {
  CHEMIN_COMPLETION,
  doitCompleterProfil,
  lireSession,
  statutResident,
} from "@/lib/session";
import { EncartPastel } from "./encart-pastel";
import { TitrePage } from "./titre-page";

const etatsBloques = {
  refuse: {
    titre: "Compte non accepté",
    sousTitre: "Votre inscription n'a pas été retenue.",
    message:
      "Votre compte n'a pas été accepté par le conseil syndical de la résidence. Si vous pensez qu'il s'agit d'une erreur, contactez le conseil syndical.",
  },
  retire: {
    titre: "Accès retiré",
    sousTitre: "Votre compte n'a plus accès à la résidence.",
    message:
      "Votre accès à la résidence a été retiré par le conseil syndical, par exemple après un déménagement. Si vous pensez qu'il s'agit d'une erreur, contactez le conseil syndical.",
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
 * s'il attend la validation du conseil syndical ; seulement un message d'état s'il a été refusé
 * ou retiré. Un membre du conseil syndical sans prénom ni nom est d'abord conduit à l'écran qui
 * les demande, sauf sur les écrans où il les saisit (`completionExigee` à faux).
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
        <EncartPastel titre={titre}>{message}</EncartPastel>
      </>
    );
  }

  return (
    <>
      {statut === "en_attente" && (
        <div className="mb-space-lg">
          <EncartPastel titre="Votre compte attend la validation du conseil syndical">
            En attendant, découvrez les activités et les annonces de la
            résidence : vous pourrez participer dès que votre compte sera
            validé.
          </EncartPastel>
        </div>
      )}
      {children}
    </>
  );
}
