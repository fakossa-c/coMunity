import { Bientot } from "comunity-ds";

export const AucuneActivite = () => (
  <Bientot
    icone="diversity_3"
    message="Aucune activité n'est prévue pour le moment. Les prochaines propositions des voisins et du syndic apparaîtront ici."
  />
);

export const RubriqueAVenir = () => <Bientot icone="event_available" />;

export const AucuneAnnonce = () => (
  <Bientot icone="mail" message="Aucune annonce du syndic en ce moment." />
);
