import Link from "next/link";
import { seDeconnecter } from "@/app/connexion/actions";
import { estSyndicActif, lireSession } from "@/lib/session";
import { Icone } from "./icone";
import type { NomIcone } from "./icones";

const styleAction =
  "flex min-h-[52px] min-w-[52px] items-center justify-center gap-space-xs rounded-md px-space-sm font-headline text-label-md text-on-surface hover:bg-surface-container-low";

/** Libellé toujours lu par les lecteurs d'écran, affiché à partir de la tablette. */
function Libelle({ icone, texte }: { icone: NomIcone; texte: string }) {
  return (
    <>
      <Icone nom={icone} className="size-6 shrink-0" />
      <span className="sr-only md:not-sr-only">{texte}</span>
    </>
  );
}

/** Actions de compte de l'en-tête : se connecter, ou rejoindre l'espace syndic et se déconnecter. */
export async function ZoneCompte() {
  const session = await lireSession();

  if (!session) {
    return (
      <Link href="/connexion" className={styleAction}>
        <Libelle icone="login" texte="Se connecter" />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {estSyndicActif(session) && (
        <Link href="/syndic" className={styleAction}>
          <Libelle icone="shield_person" texte="Espace syndic" />
        </Link>
      )}
      <form action={seDeconnecter}>
        <button type="submit" className={styleAction}>
          <Libelle icone="logout" texte="Se déconnecter" />
        </button>
      </form>
    </div>
  );
}
