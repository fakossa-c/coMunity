import {
  Atkinson_Hyperlegible_Next,
  Plus_Jakarta_Sans,
} from "next/font/google";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
  // next/font ne connaît pas les métriques de cette police : sans cette option, avertissement au build.
  adjustFontFallback: false,
});

/** Les polices du design system, posées sur `<html>` par la mise en page racine et l'erreur globale. */
export const classesPolices = `${plusJakarta.variable} ${atkinson.variable}`;

/** Le fond, le texte et la colonne pleine hauteur de `<body>`. */
export const classesCorps =
  "flex min-h-screen flex-col bg-surface font-body text-body-lg text-on-surface antialiased";
