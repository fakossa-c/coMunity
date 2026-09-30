-- Mes réglages : page d'arrivée d'un membre du conseil syndical après la connexion. Ticket #170,
-- spec #168. Migration retenue (issue #123) : la session tolère son absence en distant.

create type public.page_arrivee as enum ('tableau_de_bord', 'accueil');

alter table public.profil
  add column page_arrivee public.page_arrivee not null default 'tableau_de_bord';

comment on column public.profil.page_arrivee is 'Page choisie dans Mes réglages par un membre du conseil syndical pour arriver après la connexion : tableau de bord de l''espace syndic ou Accueil. Sans effet pour un autre compte.';

-- Même droit que la taille et le thème : la politique « Chacun modifie ses propres réglages
-- d'affichage » limite déjà la mise à jour à sa propre ligne.
grant update (page_arrivee) on public.profil to authenticated;
