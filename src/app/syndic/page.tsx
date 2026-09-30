import { redirect } from "next/navigation";

/** L'adresse de l'espace syndic mène à son tableau de bord ; son menu relie les rubriques. */
export default function EspaceSyndic() {
  redirect("/syndic/tableau-de-bord");
}
