import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { classesBouton } from "@/components/bouton";
import { BoutonCopier } from "@/components/bouton-copier";
import { EcranSecondaire } from "@/components/cadre";
import { Champ } from "@/components/champ";
import { EncartPastel } from "@/components/encart-pastel";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { lienFiche, lireFiche } from "@/lib/fiche-activite";
import { lienWhatsApp, messageWhatsApp } from "@/lib/partage-activite";

export const metadata: Metadata = { title: "Activité publiée" };

type Props = { params: Promise<{ identifiant: string }> };

/** Écran qui suit la publication : le lien de la fiche et le message à relayer, prêts à partager. */
export default async function ActivitePubliee({ params }: Props) {
  const { identifiant } = await params;
  const fiche = await lireFiche(identifiant);
  if (!fiche) notFound();
  // Seul le créateur vient de publier ; les autres arrivent sur la fiche.
  if (!fiche.est_organisateur) redirect(`/activites/${identifiant}`);

  const lien = await lienFiche(identifiant);
  const message = messageWhatsApp(fiche, lien);

  return (
    <EcranSecondaire retour={{ href: "/", libelle: "Accueil" }}>
      <TitrePage
        titre="Votre activité est publiée"
        sousTitre="Partagez-la maintenant avec vos voisins."
      />
      <div className="flex flex-col gap-bloc">
        <Champ
          libelle="Lien de la fiche"
          name="lien"
          readOnly
          defaultValue={lien}
        />
        <BoutonCopier
          texte={lien}
          libelle="Copier le lien"
          confirmation="Lien copié"
        />
        <EncartPastel titre="Message pour le groupe WhatsApp">
          <p className="[overflow-wrap:anywhere] whitespace-pre-line">
            {message}
          </p>
        </EncartPastel>
        <a
          href={lienWhatsApp(message)}
          target="_blank"
          rel="noopener noreferrer"
          className={classesBouton("action")}
        >
          <Icone nom="forum" />
          Relayer sur le groupe WhatsApp
        </a>
        <BoutonCopier
          texte={message}
          libelle="Copier le message"
          confirmation="Message copié"
        />
        <Link
          href={`/activites/${identifiant}`}
          className={classesBouton("contour")}
        >
          <Icone nom="visibility" />
          Voir la fiche
        </Link>
      </div>
    </EcranSecondaire>
  );
}
