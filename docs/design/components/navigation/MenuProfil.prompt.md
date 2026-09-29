Menu du profil, ouvert en touchant l'avatar marine de `EnTeteResidence` ou `BarreRetour`, sur **tous** les écrans. Feuille du bas blanche, rayon 28 en haut, voile encre à 40 %. Poignée de 52 px à glisser vers le bas (fermeture au-delà de 90 px), voile et bouton « Fermer » ferment aussi. À placer en dernier enfant du cadre de l'app (position absolue, `inset: 0`), hors de l'`Ecran`.

```jsx
<MenuProfil ouvert={menu} onFermer={() => setMenu(false)} onChoisir={aller}
  initiale="D" nom="Danielle" adresse="Bât. B, 2e étage" />
```

Rubriques par défaut : `profil` (Profil), `syndic` (Mon syndic), `copro` (Ma copro).

**Sur ordinateur** (cadre Journal), le même menu est un menu déroulant sous l'avatar : carte blanche de 340 px, arrondie à 28 px, ombre flottante, aligné au bord droit de l'avatar à 12 px dessous. Il entre en opacité, translation vers le bas de 10 px et léger agrandissement (0,4 s) et ressort de même (0,3 s). Pas de voile visible : un clic à côté ou Échap le ferme. Pas de poignée ni de « Fermer ». Le focus va à la première rubrique, reste dans le menu, puis revient à l'avatar. Au survol, l'avatar grossit de 7 %.