import { expect, test, type Page } from "@playwright/test";
import {
  MOT_DE_PASSE,
  inscrireResident,
  nouveauResident,
  nouvelleActivite,
  supprimerComptes,
  titreAccueil,
} from "./outils";

// Ticket #86 : « aujourd'hui » est le jour d'Europe/Paris, et une activité du jour quitte
// « à venir » (Accueil, Je participe, J'organise) pour « Archivées » à son heure de fin.

const emails: string[] = [];

test.afterEach(async () => {
  await supprimerComptes(emails.splice(0));
});

const HORLOGE_PARIS = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Une activité d'aujourd'hui (heure de Paris) qui finit à `minutes` de maintenant : date et heure
 * viennent du même instant, donc le test ne dépend pas de l'heure où il tourne.
 */
function finissantDans(minutes: number) {
  let instant = Date.now() + minutes * 60_000;
  let [date, fin] = HORLOGE_PARIS.format(new Date(instant)).split(" ");
  // Une fin à minuit pile n'aurait aucun début possible avant elle.
  if (fin === "00:00") {
    instant += 60_000;
    [date, fin] = HORLOGE_PARIS.format(new Date(instant)).split(" ");
  }
  return { date_activite: date, heure_debut: "00:00", heure_fin: fin };
}

async function seConnecter(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("Adresse email").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(titreAccueil(page)).toBeVisible();
}

test("une activité du jour terminée quitte l'Accueil, « Je participe » et « J'organise » pour « Archivées »", async ({
  page,
}) => {
  const organisateur = await nouveauResident("valide");
  const voisin = await nouveauResident("valide");
  emails.push(organisateur.email, voisin.email);
  const suffixe = Date.now();
  const titres = {
    finieOrganisee: `Brunch fini ${suffixe}`,
    finieSuivie: `Atelier fini ${suffixe}`,
    enCours: `Veillée en cours ${suffixe}`,
  };
  await nouvelleActivite(organisateur.id, {
    titre: titres.finieOrganisee,
    ...finissantDans(-10),
  });
  const suivie = await nouvelleActivite(organisateur.id, {
    titre: titres.finieSuivie,
    ...finissantDans(-10),
  });
  await inscrireResident(suivie, voisin.id);
  const enCours = await nouvelleActivite(organisateur.id, {
    titre: titres.enCours,
    ...finissantDans(60),
  });
  await inscrireResident(enCours, voisin.id);

  await seConnecter(page, organisateur.email);
  const main = page.getByRole("main");
  await expect(main).toContainText(titres.enCours);
  await expect(main).not.toContainText(titres.finieOrganisee);
  await expect(main).not.toContainText(titres.finieSuivie);

  await page.goto("/activites?onglet=j_organise");
  await expect(
    page.getByRole("list", { name: "Activités que vous organisez" }),
  ).toContainText(titres.enCours);
  await expect(main).not.toContainText(titres.finieOrganisee);

  await page.goto("/activites?onglet=archivees");
  const archivees = page.getByRole("list", { name: "Activités archivées" });
  await expect(archivees).toContainText(titres.finieOrganisee);
  await expect(archivees).toContainText("Organisée par vous");
  await expect(archivees).not.toContainText(titres.enCours);

  // Le voisin suit les deux : la terminée est archivée, l'autre reste à venir.
  await page.context().clearCookies();
  await seConnecter(page, voisin.email);
  await page.goto("/activites");
  const participe = page.getByRole("list", {
    name: "Activités où vous participez",
  });
  await expect(participe).toContainText(titres.enCours);
  await expect(participe).not.toContainText(titres.finieSuivie);
  await page.goto("/activites?onglet=archivees");
  await expect(
    page.getByRole("list", { name: "Activités archivées" }),
  ).toContainText(titres.finieSuivie);
});
