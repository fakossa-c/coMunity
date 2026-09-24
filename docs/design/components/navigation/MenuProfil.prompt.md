Menu du profil, ouvert en touchant l'avatar marine de `EnTeteResidence` ou `BarreRetour`, sur **tous** les écrans. Feuille du bas blanche, rayon 28 en haut, voile encre à 40 %. Poignée de 52 px à glisser vers le bas (fermeture au-delà de 90 px), voile et bouton « Fermer » ferment aussi. À placer en dernier enfant du cadre de l'app (position absolue, `inset: 0`), hors de l'`Ecran`.

```jsx
<MenuProfil ouvert={menu} onFermer={() => setMenu(false)} onChoisir={aller}
  initiale="D" nom="Danielle" adresse="Bât. B, 2e étage" />
```

Rubriques par défaut : `profil` (Profil), `syndic` (Mon syndic), `copro` (Ma copro).