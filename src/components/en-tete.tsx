import Link from "next/link";
import { lireResidence } from "@/lib/residence";
import { Icone } from "./icone";

export async function EnTete() {
  const residence = await lireResidence();

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-surface/90 pt-[env(safe-area-inset-top)] shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[980px] items-center px-margin desktop:px-margin-desktop">
        <Link
          href="/"
          className="flex min-h-[52px] min-w-0 items-center gap-space-sm rounded-xl"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
            <Icone nom="apartment" className="size-6" />
          </span>
          <span className="truncate font-headline text-headline-sm text-primary">
            {residence?.nom ?? "Notre résidence"}
          </span>
        </Link>
      </div>
    </header>
  );
}
