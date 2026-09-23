import { Icone } from "./icone";
import type { NomIcone } from "./icones";

type Props = { icone: NomIcone; message?: string };

/** Encart d'une rubrique pas encore ouverte. */
export function Bientot({
  icone,
  message = "Cette rubrique ouvrira bientôt.",
}: Props) {
  return (
    <section className="flex items-start gap-space-sm rounded-lg border-[1.5px] border-border-distinct/20 bg-surface-container-low p-space-md">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed">
        <Icone nom={icone} className="size-7" />
      </span>
      <p className="max-w-[65ch] text-body-lg text-on-surface">{message}</p>
    </section>
  );
}
