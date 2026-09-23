import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renouvelle la session Supabase avant chaque page : le jeton d'accès expire au bout
 * d'une heure, et une page en cours de rendu ne peut pas réécrire les cookies.
 */
export async function proxy(requete: NextRequest) {
  let reponse = NextResponse.next({ request: requete });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !cle) return reponse;

  const supabase = createServerClient(url, cle, {
    cookies: {
      getAll: () => requete.cookies.getAll(),
      setAll(aEcrire, entetes) {
        for (const { name, value } of aEcrire) requete.cookies.set(name, value);
        reponse = NextResponse.next({ request: requete });
        for (const { name, value, options } of aEcrire) {
          reponse.cookies.set(name, value, options);
        }
        for (const [nom, valeur] of Object.entries(entetes)) {
          reponse.headers.set(nom, valeur);
        }
      },
    },
  });
  await supabase.auth.getClaims();

  return reponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
