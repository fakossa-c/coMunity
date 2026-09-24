Carte d'annonce du syndic (écran Annonces) : une information à lire, jamais une activité, donc ni photo, ni jauge, ni « Je participe ». Même carte blanche que CarteActivite. Ordre : pastille de type · [Nouveau] · date de publication · titre · texte · infos · bloc spécifique · boutons.

```jsx
<CarteAnnonce type="ag" nouvelle publiee="Publiée le 20 oct. par le syndic" titre="Assemblée générale annuelle"
  texte="L’ordre du jour et les documents sont disponibles."
  infos={[{ icone: "event", titre: "Jeudi 12 novembre à 18h30" }, { icone: "location_on", titre: "Salle commune", detail: "Rez-de-chaussée, bât. A" }]}
  actions={<Bouton variante="contour" icone="description">Lire la convocation</Bouton>} />

<CarteAnnonce type="sondage" publiee="…" titre="Horaires du local vélos">
  <Sondage question="Quel créneau vous convient le mieux ?" options={[…]} echeance="30 octobre" />
</CarteAnnonce>

<CarteAnnonce type="travaux" titre="Rénovation du hall d’entrée" infos={[{ icone: "date_range", titre: "Du 2 au 20 novembre" }]}
  actions={<Bouton variante="contour" icone="forum">Relayer sur le groupe WhatsApp</Bouton>} />
```

Types : `ag` pêche · `sondage` abricot · `travaux` et `info` vert.