-- Espaces communs de la résidence et règles de l'assistant (ticket #11, spec #57). Le conseil
-- syndical gère les espaces communs et l'heure de calme ; une activité se tient dans un espace
-- commun ou dans un lieu libre. Dans un espace commun, la base refuse un créneau qui finit après
-- son heure de fin maximale et plus de places qu'il n'en accueille : le parcours le dit avant,
-- l'assistant du navigateur n'est pas une garantie.

create type public.equipement_espace as enum (
  'acces_plain_pied',
  'ascenseur',
  'chaises',
  'tables',
  'cuisine',
  'toilettes',
  'exterieur'
);

comment on type public.equipement_espace is 'La liste fermée des équipements et de l''accessibilité d''un espace commun. Les libellés vivent dans le code (src/lib/espaces-communs.ts).';

create table public.espace_commun (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique check (length(trim(nom)) between 1 and 60),
  batiment text check (length(batiment) <= 60),
  localisation text check (length(localisation) <= 120),
  description text check (length(description) <= 500),
  capacite integer check (capacite > 0),
  equipements public.equipement_espace[] not null default '{}',
  heure_fin_max time,
  consignes text check (length(consignes) <= 500),
  horaires_acces text check (length(horaires_acces) <= 120),
  contact text check (length(contact) <= 120),
  cree_le timestamptz not null default now()
);

comment on table public.espace_commun is 'Un lieu de la résidence défini par le conseil syndical (salle commune, cour, jardin), où une activité peut se tenir.';
comment on column public.espace_commun.capacite is '`null` : pas de capacité fixée. Sinon, aucune activité de l''espace n''a plus de places, ni une absence de limite.';
comment on column public.espace_commun.heure_fin_max is '`null` : pas d''heure limite. Sinon, aucune activité de l''espace ne finit après.';
comment on column public.espace_commun.consignes is 'Affichées au créateur pendant le parcours et sur la fiche des activités de l''espace.';

alter table public.espace_commun enable row level security;

revoke all on public.espace_commun from anon, authenticated;
grant select, delete on public.espace_commun to authenticated;
grant insert (
  nom, batiment, localisation, description, capacite, equipements, heure_fin_max, consignes,
  horaires_acces, contact
) on public.espace_commun to authenticated;
grant update (
  nom, batiment, localisation, description, capacite, equipements, heure_fin_max, consignes,
  horaires_acces, contact
) on public.espace_commun to authenticated;

create policy "Les comptes actifs consultent les espaces communs"
  on public.espace_commun for select
  to authenticated
  using ((select public.peut_consulter()));

create policy "Le conseil syndical crée un espace commun"
  on public.espace_commun for insert
  to authenticated
  with check ((select public.est_syndic()));

create policy "Le conseil syndical modifie un espace commun"
  on public.espace_commun for update
  to authenticated
  using ((select public.est_syndic()))
  with check ((select public.est_syndic()));

create policy "Le conseil syndical supprime un espace commun"
  on public.espace_commun for delete
  to authenticated
  using ((select public.est_syndic()));

-- L'heure de calme existe depuis la création de la résidence ; le conseil syndical la règle.
grant update (heure_calme) on public.residence to authenticated;

create policy "Le conseil syndical règle la résidence"
  on public.residence for update
  to authenticated
  using ((select public.est_syndic()))
  with check ((select public.est_syndic()));

-- Une activité se tient dans un espace commun, ou dans un lieu libre (`espace_commun_id` nul).
-- `lieu` garde le nom de l'espace : les écrans qui l'affichent n'ont rien à joindre, et une
-- activité dont l'espace est supprimé garde son nom comme lieu libre.
alter table public.activite
  add column espace_commun_id uuid references public.espace_commun (id) on delete set null;

comment on column public.activite.espace_commun_id is '`null` : lieu libre, saisi dans `lieu`. Sinon `lieu` est le nom de l''espace, tenu à jour par la base.';

create index activite_espace_commun_idx on public.activite (espace_commun_id, date_activite)
  where espace_commun_id is not null;

grant insert (espace_commun_id) on public.activite to authenticated;
grant update (espace_commun_id) on public.activite to authenticated;

/**
 * Applique les règles bloquantes de l'espace commun d'une activité : heure de fin maximale et
 * capacité (une activité sans limite de places n'entre pas dans un espace limité). Donne aussi
 * à `lieu` le nom de l'espace. Un lieu libre n'a pas de règles.
 */
create function public.verifier_espace_activite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  espace public.espace_commun;
begin
  if new.espace_commun_id is null then
    return new;
  end if;

  select * into espace from public.espace_commun where id = new.espace_commun_id;
  if not found then
    raise exception 'Espace commun introuvable' using errcode = '23503';
  end if;
  new.lieu := espace.nom;

  -- Une modification qui ne touche ni l'espace, ni l'heure de fin, ni les places passe : les
  -- règles de l'espace ont pu changer depuis la publication.
  if tg_op = 'UPDATE'
    and new.espace_commun_id is not distinct from old.espace_commun_id
    and new.heure_fin is not distinct from old.heure_fin
    and new.capacite_max is not distinct from old.capacite_max then
    return new;
  end if;

  if espace.heure_fin_max is not null and new.heure_fin > espace.heure_fin_max then
    raise exception 'L''activité finit après l''heure de fin maximale de l''espace commun (%)',
      to_char(espace.heure_fin_max, 'HH24"h"MI')
      using errcode = 'P0007';
  end if;
  if espace.capacite is not null
    and (new.capacite_max is null or new.capacite_max > espace.capacite) then
    raise exception 'L''activité a plus de places que l''espace commun n''en accueille (%)',
      espace.capacite
      using errcode = 'P0008';
  end if;
  return new;
end;
$$;

revoke execute on function public.verifier_espace_activite() from public, anon, authenticated;

create trigger activite_regles_espace
  before insert or update on public.activite
  for each row
  execute function public.verifier_espace_activite();

/** Un espace commun renommé renomme le lieu de ses activités. */
create function public.renommer_lieu_des_activites()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.activite set lieu = new.nom where espace_commun_id = new.id;
  return new;
end;
$$;

revoke execute on function public.renommer_lieu_des_activites() from public, anon, authenticated;

create trigger espace_commun_renomme
  after update of nom on public.espace_commun
  for each row
  when (new.nom is distinct from old.nom)
  execute function public.renommer_lieu_des_activites();

-- La fiche donne l'espace commun de l'activité et ses consignes, à qui peut lire les espaces
-- communs : un visiteur n'en voit que le nom, dans `lieu`.
drop function public.fiche_activite(text);

/**
 * La fiche d'une activité, lisible par tous à partir de son identifiant public. La jauge
 * (places prises et capacité, `null` si l'activité n'en a pas) est toujours donnée ;
 * l'inscription et le retour de la personne connectée ne sont donnés qu'à elle-même ; l'espace
 * commun et ses consignes, qu'à un compte qui peut consulter.
 */
create function public.fiche_activite(identifiant text)
returns table (
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  description text,
  date_activite date,
  heure_debut time,
  heure_fin time,
  lieu text,
  proposee_par_syndic boolean,
  organisateur_nom_affiche text,
  est_organisateur boolean,
  capacite_max integer,
  places_prises integer,
  mes_accompagnants smallint,
  capacite_min integer,
  etiquettes public.etiquette_activite[],
  mot_accueil text,
  conseils_pratiques text,
  materiel_prevoir text,
  a_apporter text,
  precision_acces text,
  statut public.statut_activite,
  mon_retour_note smallint,
  mon_retour_commentaire text,
  espace_commun_id uuid,
  consignes_espace text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.identifiant_public,
    a.titre,
    a.categorie,
    a.pictogramme,
    a.description,
    a.date_activite,
    a.heure_debut,
    a.heure_fin,
    a.lieu,
    p.role = 'syndic',
    case when public.peut_consulter() then public.nom_affiche(p.prenom, p.nom) end,
    a.organisateur is not distinct from auth.uid(),
    a.capacite_max,
    public.places_prises(a.id),
    (
      select i.accompagnants from public.inscription_activite i
      where i.activite_id = a.id and i.resident_id = auth.uid()
    ),
    a.capacite_min,
    a.etiquettes,
    a.mot_accueil,
    a.conseils_pratiques,
    a.materiel_prevoir,
    a.a_apporter,
    a.precision_acces,
    a.statut,
    (
      select r.note from public.retour r
      where r.activite_id = a.id and r.resident_id = auth.uid()
    ),
    (
      select r.commentaire from public.retour r
      where r.activite_id = a.id and r.resident_id = auth.uid()
    ),
    case when public.peut_consulter() then a.espace_commun_id end,
    case when public.peut_consulter() then e.consignes end
  from public.activite a
  join public.profil p on p.id = a.organisateur
  left join public.espace_commun e on e.id = a.espace_commun_id
  where a.identifiant_public = identifiant;
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;
