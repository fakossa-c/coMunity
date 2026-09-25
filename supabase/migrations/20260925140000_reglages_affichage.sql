-- Mes réglages : taille des caractères et thème, sur le profil. Ticket #19, spec #1
-- (tokens et attributs `data-taille` / `data-theme` posés par la spec #34).

create type public.taille_affichage as enum ('standard', 'grands');
create type public.theme_affichage as enum ('clair', 'sombre');

alter table public.profil
  add column taille public.taille_affichage not null default 'standard',
  add column theme public.theme_affichage not null default 'clair';

comment on column public.profil.taille is 'Taille des caractères choisie dans Mes réglages : pilote l''attribut `data-taille` de la racine du document.';
comment on column public.profil.theme is 'Thème choisi dans Mes réglages : pilote l''attribut `data-theme` de la racine du document.';

grant update (taille, theme) on public.profil to authenticated;

create policy "Chacun modifie ses propres réglages d'affichage"
  on public.profil for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
