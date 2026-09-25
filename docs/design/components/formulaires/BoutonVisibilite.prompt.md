Pilule 52 px qui dit si une information du profil est vue par les voisins : vert « Visible » (œil), bleu « Masqué » (œil barré), cadenas si verrouillée. Se place en `fin` d'une ligne de `CarteLignes`. Accompagner la carte d'un `EncartPastel` qui résume en clair ce que voient les voisins.

```jsx
<BoutonVisibilite libelle="Téléphone" visible={vis.telephone} onClick={() => basculer("telephone")} />
<BoutonVisibilite libelle="Pseudo" visible verrou />
```