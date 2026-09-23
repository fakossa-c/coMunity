import type { Metadata } from "next";
import Link from "next/link";
import { Icone } from "@/components/icone";
import { TitrePage } from "@/components/titre-page";
import { accesSyndic } from "./acces";

export const metadata: Metadata = { title: "Espace syndic" };

export default async function EspaceSyndic() {
  const { refus } = await accesSyndic("/syndic");
  if (refus) return refus;

  return (
    <>
      <TitrePage
        titre="Espace syndic"
        sousTitre="Gérez la vie de la résidence et les accès de l'équipe."
      />
      <ul className="grid gap-space-md desktop:grid-cols-2">
        <li>
          <Link
            href="/syndic/membres"
            className="flex min-h-[52px] items-center gap-space-md rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-lowest p-space-md shadow-[0_3px_0_0_rgba(24,34,48,0.08)] hover:border-border-distinct"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
              <Icone nom="shield_person" className="size-7" />
            </span>
            <span className="flex-1">
              <span className="block font-headline text-headline-sm text-on-surface">
                Membres du syndic
              </span>
              <span className="block text-body-md text-on-surface-variant">
                Invitez un collègue ou retirez un accès.
              </span>
            </span>
            <Icone nom="chevron_right" className="size-6 shrink-0" />
          </Link>
        </li>
      </ul>
    </>
  );
}
