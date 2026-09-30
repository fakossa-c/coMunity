-- Jour de référence : les dernières comparaisons sur l'heure ou le jour d'UTC passent à Paris
-- (ticket #151, suite de #86). Une annonce ou un sondage qui expire « hier » à Paris n'est plus
-- ouvert côté base entre 00h et 02h, et une activité compte comme tenue, ou à venir pour la
-- suppression d'un compte, à son heure de fin de Paris.
--
-- Migration additive : chaque fonction est recréée sous la même signature et avec le même type de
-- retour, seule la comparaison change (`now()` devient `public.maintenant_reference()`,
-- `current_date` devient `public.jour_reference()`), et la politique d'insertion des sondages est
-- recréée sous le même nom. Rien n'est retiré ni renommé : le code de `main` s'en sert sans le
-- savoir. Les droits d'exécution ne bougent pas : `create or replace` les conserve.

-- `annonces_du_moment` (security invoker) et la politique d'insertion des sondages s'exécutent avec
-- les droits de la personne connectée, qui doit donc pouvoir lire le jour de référence : #86 les
-- avait fermées à l'API parce que seules des fonctions `security definer` s'en servaient. Elles ne
-- livrent que la date et l'heure de Paris, rien de personnel ; `anon` n'y touche toujours pas.
grant execute on function public.maintenant_reference() to authenticated;
grant execute on function public.jour_reference() to authenticated;

-- Les statistiques du tableau de bord comptent une activité tenue à son heure de fin de Paris.
create or replace function public.activites_tenues(p_debut date, p_fin date)
returns setof public.activite
language sql
stable
security definer
set search_path = ''
as $$
  select a.*
  from public.activite a
  where a.statut = 'publiee'
    and a.date_activite between p_debut and p_fin
    and (a.date_activite + a.heure_fin) < public.maintenant_reference();
$$;

-- Le compte supprimé annule ou supprime les activités qui ne sont pas terminées à l'heure de Paris.
create or replace function public.supprimer_mon_compte()
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  moi uuid := auth.uid();
  annulees uuid[];
  supprimees uuid[];
begin
  if moi is null or not exists (
    select 1 from public.profil where id = moi and role = 'resident'
  ) then
    raise exception 'Seul un résident supprime son compte ici' using errcode = '42501';
  end if;

  -- Le profil verrouillé, plus aucune activité ne se crée pour ce compte pendant la suppression
  -- (la clé étrangère de l'activité attend ce verrou) ; les siennes, verrouillées comme le fait
  -- `s_inscrire`, ne reçoivent plus d'inscription.
  perform 1 from public.profil where id = moi for update;
  perform 1 from public.activite where organisateur = moi for update;

  with maj as (
    update public.activite a
    set statut = 'annulee', photos = '{}'
    where a.organisateur = moi
      and (a.date_activite + a.heure_fin) >= public.maintenant_reference()
      and a.statut in ('publiee', 'annulee')
      and exists (
        select 1 from public.inscription_activite i
        where i.activite_id = a.id and i.resident_id <> moi
      )
    returning a.id
  )
  select coalesce(array_agg(id), '{}') into annulees from maj;

  with sup as (
    delete from public.activite a
    where a.organisateur = moi
      and (a.date_activite + a.heure_fin) >= public.maintenant_reference()
      and (
        a.statut in ('en_relecture', 'masquee')
        or not exists (
          select 1 from public.inscription_activite i
          where i.activite_id = a.id and i.resident_id <> moi
        )
      )
    returning a.id
  )
  select coalesce(array_agg(id), '{}') into supprimees from sup;

  -- Ce qui reste (activités passées, retours) perd son auteur ; le profil, les inscriptions et les
  -- réponses aux sondages partent avec le compte, en cascade.
  update public.activite set organisateur = null where organisateur = moi;
  update public.retour set resident_id = null where resident_id = moi;
  delete from auth.users where id = moi;

  return annulees || supprimees;
end;
$$;

-- Une annonce reste dans la liste jusqu'à la fin du jour d'expiration, à Paris.
create or replace function public.annonces_du_moment()
returns setof public.annonce
language sql
stable
security invoker
set search_path = ''
as $$
  select * from public.annonce
  where expire_le is null or expire_le >= public.jour_reference()
  order by epinglee desc, publiee_le desc;
$$;

-- La date limite d'un sondage se lit au jour de Paris : à la création (politique d'insertion),
-- à la réponse et pour ouvrir les résultats.
drop policy "Le conseil syndical joint un sondage à une annonce" on public.sondage;

create policy "Le conseil syndical joint un sondage à une annonce"
  on public.sondage for insert
  to authenticated
  with check ((select public.est_syndic()) and echeance >= public.jour_reference());

create or replace function public.repondre_sondage(p_sondage uuid, p_choix integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  echeance_sondage date;
  nombre_options integer;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut répondre à un sondage' using errcode = '42501';
  end if;

  select echeance, cardinality(options) into echeance_sondage, nombre_options
  from public.sondage
  where id = p_sondage;
  if not found then
    raise exception 'Sondage introuvable' using errcode = 'P0002';
  end if;
  if echeance_sondage < public.jour_reference() then
    raise exception 'La date limite du sondage est passée' using errcode = '23514';
  end if;
  if p_choix is null or p_choix < 1 or p_choix > nombre_options then
    raise exception 'Ce choix n''est pas une option du sondage' using errcode = '23514';
  end if;

  insert into public.reponse_sondage (sondage_id, profil_id, choix)
  values (p_sondage, (select auth.uid()), p_choix);
end;
$$;

create or replace function public.resultats_sondages(p_sondages uuid[])
returns table (sondage_id uuid, choix integer, votes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, o.choix, count(r.profil_id)::integer
  from public.sondage s
  cross join lateral generate_series(1, cardinality(s.options)) as o (choix)
  left join public.reponse_sondage r on r.sondage_id = s.id and r.choix = o.choix
  where s.id = any (p_sondages)
    and public.peut_consulter()
    and (
      public.est_syndic()
      or s.echeance < public.jour_reference()
      or exists (
        select 1 from public.reponse_sondage moi
        where moi.sondage_id = s.id and moi.profil_id = (select auth.uid())
      )
    )
  group by s.id, o.choix
  order by s.id, o.choix;
$$;
