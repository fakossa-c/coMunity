import type { Metadata } from "next";
import Link from "next/link";
import { Icone } from "@/components/icone";
import type { NomIcone } from "@/components/icones";
import { TitrePage } from "@/components/titre-page";
import { clientSession } from "@/lib/supabase/serveur";
import { accesSyndic } from "./acces";

export const metadata: Metadata = { title: "Espace syndic" };

export default async function EspaceSyndic() {
  const { refus } = await accesSyndic("/syndic");
  if (refus) return refus;

  const supabase = await clientSession();
  const { count: enAttente } = await supabase
    .from("profil")
    .select("id", { count: "exact", head: true })
    .eq("role", "resident")
    .eq("statut", "en_attente");

  return (
    <>
      <TitrePage
        titre="Espace syndic"
        sousTitre="Gérez la vie de la résidence et les accès de l'équipe."
      />
      <ul className="grid gap-space-md desktop:grid-cols-2">
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
      </ul>
    </>
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
