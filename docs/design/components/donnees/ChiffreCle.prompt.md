Un chiffre du tableau de bord dans une carte à bordure de 1,5 px (sans ombre, rayon 16, padding 16) : le libellé en Plus Jakarta Sans 700, la valeur en grand (titre de page, 28/36 sur mobile, plus grand sur ordinateur), puis une précision en gris. À placer dans une liste de définitions (`dl`) : le libellé est le terme, la valeur et la précision sont ses définitions.

```jsx
<dl className="grid gap-space-md desktop:grid-cols-4">
  <ChiffreCle libelle="Participants distincts" valeur={42} precision="Résidents différents inscrits à au moins une activité." />
</dl>
```
