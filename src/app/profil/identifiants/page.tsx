import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { seDeconnecter } from "@/app/connexion/actions";
import { Bouton, classesBouton } from "@/components/bouton";
import { EcranSecondaire } from "@/components/cadre";
import { CarteLignes } from "@/components/carte-lignes";
import { Annonce } from "@/components/formulaire";
import { TitrePage } from "@/components/titre-page";
import { configurationSupabase, clientSession } from "@/lib/supabase/serveur";

export const metadata: Metadata = { title: "Mes identifiants" };

const CONFIRMATIONS: Record<string, string> = {
  "mot-de-passe": "Votre mot de passe est modifié.",
  "email-confirme": "Votre adresse e-mail est modifiée.",
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
  // Le compte lu à la source, et non dans le jeton de session : il porte l'adresse en attente.
  const utilisateur = configurationSupabase()
    ? (await (await clientSession()).auth.getUser()).data.user
    : null;
  if (!utilisateur) redirect("/connexion?suivant=%2Fprofil%2Fidentifiants");

  const { fait, lien } = await searchParams;
  const confirmation = typeof fait === "string" ? CONFIRMATIONS[fait] : null;
  const enAttente = utilisateur.new_email
    ? `Un lien de confirmation a été envoyé à ${utilisateur.new_email}. Votre adresse changera quand vous l'aurez ouvert.`
    : null;

  return (
    <EcranSecondaire retour={{ href: "/profil", libelle: "Profil" }}>
      <div className="flex max-w-xl flex-col gap-bloc">
        <TitrePage titre="Mes identifiants" />
        <Annonce message={confirmation ?? enAttente} />
        <Annonce
          message={
            lien === "invalide"
              ? "Ce lien n'est plus valable : il a déjà servi ou il a expiré. Refaites la demande avec « Modifier » sur la ligne E-mail."
              : null
          }
          erreur
        />
        <CarteLignes
          libelle="Vos identifiants"
          lignes={[
            {
              icone: "mail",
              titre: "E-mail",
              detail: utilisateur.email,
              fin: (
                <Modifier href="/profil/identifiants/email" quoi="l'e-mail" />
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
        <form action={seDeconnecter}>
          <Bouton type="submit" variante="contour" icone="logout" pleineLargeur>
            Se déconnecter
          </Bouton>
        </form>
      </div>
    </EcranSecondaire>
  );
}
