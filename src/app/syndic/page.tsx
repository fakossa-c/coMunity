import type { Metadata } from "next";
import Link from "next/link";
import { EcranSecondaire } from "@/components/cadre";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic } from "./acces";

const RETOUR = { href: "/", libelle: "Accueil" };

export const metadata: Metadata = { title: "Espace syndic" };

export default async function EspaceSyndic() {
  const { refus } = await accesSyndic("/syndic");
  if (refus) return <EcranSecondaire retour={RETOUR}>{refus}</EcranSecondaire>;

  const supabase = await clientSession();
  const { count: enAttente } = await supabase
    .from("profil")
    .select("id", { count: "exact", head: true })
    .eq("role", "resident")
    .eq("statut", "en_attente");

  const { count: aRelire } = await supabase
    .from("activite")
    .select("id", { count: "exact", head: true })
    .eq("statut", "en_relecture");

  return (
    <EcranSecondaire retour={RETOUR}>
      <TitrePage
        titre="Espace syndic"
        sousTitre="Gérez la vie de la résidence et les accès de l'équipe."
      />
      <ul className="grid gap-space-md desktop:grid-cols-2">
        <Rubrique
          href="/syndic/tableau-de-bord"
          icone="monitoring"
          titre="Tableau de bord"
          description="Activités, inscriptions, remplissage, retours des participants : ce qui fait vivre la résidence."
        />
        <Rubrique
          href="/syndic/residents"
          icone="group"
          titre="Résidents"
          description={
            enAttente
              ? `${enAttente} ${enAttente === 1 ? "compte attend" : "comptes attendent"} votre validation.`
              : "Validez les nouveaux comptes, retirez l'accès d'un résident qui déménage."
          }
        />
        <Rubrique
          href="/syndic/membres"
          icone="shield_person"
          titre="Membres du syndic"
          description="Invitez un collègue ou retirez un accès."
        />
        <Rubrique
          href="/syndic/espaces-communs"
          icone="meeting_room"
          titre="Espaces communs"
          description="Salle commune, cour, jardin : capacité, horaires, consignes, et l'heure de calme."
        />
        <Rubrique
          href="/syndic/reglement"
          icone="menu_book"
          titre="Règlement intérieur"
          description="Rédigez les règles de vie de la résidence, section par section."
        />
        <Rubrique
          href="/syndic/mon-syndic"
          icone="support_agent"
          titre="Mon syndic"
          description="Présentez aux résidents les personnes du syndic : photo, téléphone, e-mail."
        />
        <Rubrique
          href="/syndic/moderation"
          icone="visibility_off"
          titre="Modération des activités"
          description={
            aRelire
              ? `${aRelire} ${aRelire === 1 ? "activité à relire" : "activités à relire"} : publiez-${aRelire === 1 ? "la" : "les"} ou refusez-${aRelire === 1 ? "la" : "les"} avec un message.`
              : "Relisez les activités mises de côté, masquez ou rétablissez une activité."
          }
        />
        <Rubrique
          href="/syndic/annonces"
          icone="campaign"
          titre="Annonces"
          description="Publiez assemblées, travaux et informations pratiques, épinglez-les et partagez leur lien."
        />
      </ul>
    </EcranSecondaire>
  );
}

function Rubrique({
  href,
  icone,
  titre,
  description,
}: {
  href: string;
  icone: NomIcone;
  titre: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full min-h-[52px] items-center gap-space-md rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)] hover:border-border-distinct"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
          <Icone nom={icone} className="size-7" />
        </span>
        <span className="flex-1">
          <span className="block font-headline text-headline-sm text-on-surface">
            {titre}
          </span>
          <span className="block text-body-md text-on-surface-variant">
            {description}
          </span>
        </span>
        <Icone nom="chevron_right" className="size-6 shrink-0" />
      </Link>
    </li>
  );
}
