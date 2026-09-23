-- Une instance = une résidence : la table n'accepte qu'une seule ligne.
create table public.residence (
  id boolean primary key default true check (id),
  nom text not null check (length(trim(nom)) > 0),
  logo text,
  code text not null unique check (length(code) >= 6),
  heure_calme time not null default '22:00'
);

comment on table public.residence is 'La résidence servie par cette instance (ligne unique).';
comment on column public.residence.code is 'Code à saisir par un résident pour créer son compte. Jamais lisible par un visiteur.';
comment on column public.residence.heure_calme is 'Heure à partir de laquelle l''assistant avertit qu''une activité finit trop tard.';

alter table public.residence enable row level security;

-- Le code de résidence reste hors de portée : seules les colonnes publiques sont lisibles.
revoke all on public.residence from anon, authenticated;
grant select (id, nom, logo, heure_calme) on public.residence to anon, authenticated;

create policy "La résidence est lisible par tous"
  on public.residence for select
  to anon, authenticated
  using (true);
