import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { seDeconnecter } from "@/app/connexion/actions";
import { Bouton, classesBouton } from "@/components/bouton";
import { EcranSecondaire } from "@/components/cadre";
import { CarteLignes } from "@/components/carte-lignes";
import { Annonce } from "@/components/formulaire";
import { lireSession } from "@/lib/session";
import { configurationSupabase, clientSession } from "@/lib/supabase/serveur";
import { TitrePage } from "@/components/titre-page";
import { DeuxColonnes } from "../deux-colonnes";
import { SuppressionCompte } from "./suppression-compte";

export const metadata: Metadata = { title: "Mes identifiants" };

const CONFIRMATIONS: Record<string, string> = {
  "mot-de-passe": "Votre mot de passe est modifié.",
  "email-confirme": "Votre adresse email est modifiée.",
};

function Modifier({ href, quoi }: { href: string; quoi: string }) {
  return (
    <Link
      href={href}
      aria-label={`Modifier ${quoi}`}
      className={`${classesBouton("fantome")} shrink-0`}
    >
      Modifier
    </Link>
  );
}

export default async function MesIdentifiants({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  const { fait, lien } = await searchParams;
  // Le compte lu à la source, et non dans le jeton de session : il porte l'adresse en attente.
  const utilisateur = configurationSupabase()
    ? (await (await clientSession()).auth.getUser()).data.user
    : null;
  if (!utilisateur) {
    // Un lien d'email périmé, ouvert sans session : son explication attend la connexion.
    const suivant =
      lien === "invalide"
        ? "/profil/identifiants?lien=invalide"
        : "/profil/identifiants";
    redirect(`/connexion?suivant=${encodeURIComponent(suivant)}`);
  }

  // Un membre du syndic ne supprime pas son compte ici : son départ passe par le retrait d'accès.
  const peutSupprimer = (await lireSession())?.role !== "syndic";
  const confirmation = typeof fait === "string" ? CONFIRMATIONS[fait] : null;
  const enAttente = utilisateur.new_email
    ? `Un lien de confirmation a été envoyé à ${utilisateur.new_email}. Votre adresse changera quand vous l'aurez ouvert.`
    : null;

  return (
    <EcranSecondaire retour={{ href: "/profil", libelle: "Profil" }}>
      <div className="flex max-w-xl flex-col gap-bloc desktop:max-w-none">
        <TitrePage titre="Mes identifiants" />
        <Annonce message={confirmation ?? enAttente} />
        <Annonce
          message={
            lien === "invalide"
              ? "Ce lien n'est plus valable : il a déjà servi ou il a expiré. Refaites la demande avec « Modifier » sur la ligne Email."
              : null
          }
          erreur
        />
        <DeuxColonnes>
          <CarteLignes
            libelle="Vos identifiants"
            lignes={[
              {
                icone: "mail",
                titre: "Email",
                detail: utilisateur.email,
                fin: (
                  <Modifier href="/profil/identifiants/email" quoi="l'email" />
                ),
              },
              {
                icone: "lock",
                titre: "Mot de passe",
                detail: "••••••••",
                fin: (
                  <Modifier
                    href="/profil/identifiants/mot-de-passe"
                    quoi="le mot de passe"
                  />
                ),
              },
            ]}
          />
          <div className="flex flex-col gap-bloc">
            <form action={seDeconnecter}>
              <Bouton
                type="submit"
                variante="contour"
                icone="logout"
                pleineLargeur
                className="desktop:w-auto desktop:self-start"
              >
                Se déconnecter
              </Bouton>
            </form>
            {peutSupprimer && <SuppressionCompte />}
          </div>
        </DeuxColonnes>
      </div>
    </EcranSecondaire>
  );
}
