-- Modération des activités par le conseil syndical (ticket #14, spec #58).
--
-- Une activité `en_relecture` ou `masquee` n'est visible que de son créateur et du conseil
-- syndical, lien public compris. Le conseil syndical publie, refuse (masque avec un message),
-- rétablit, modifie ou annule toute activité ; le créateur voit l'état et le message. Sans
-- décision de modération, une activité est publiée directement : `publiee` reste la valeur par
-- défaut. Le ticket #20 (Jev) met une activité en relecture par `mettre_en_relecture`.
--
-- Migration additive : une table, des fonctions et des politiques nouvelles ; les fonctions
-- redéfinies gardent leurs colonnes, la fiche en gagne deux.

/**
 * Ce que dit la modération d'une activité : la raison de sa mise en relecture (donnée par Jev ou
 * par le conseil syndical, lue par le conseil syndical seul) et le message de la dernière décision
 * (lu par le créateur et le conseil syndical). Table à part : la table `activite` se lit en
 * entier par tout compte actif, ces deux textes non.
 */
create table public.moderation_activite (
  activite_id uuid primary key references public.activite (id) on delete cascade,
  raison_relecture text check (length(raison_relecture) between 1 and 500),
  message text check (length(message) between 1 and 500),
  decidee_le timestamptz
);

comment on table public.moderation_activite is 'La raison de mise en relecture et le message de la dernière décision du conseil syndical sur une activité. Écrite par `mettre_en_relecture` et `moderer_activite` seulement.';
comment on column public.moderation_activite.raison_relecture is 'Pourquoi l''activité a été mise en relecture. Lue par le conseil syndical seul : le créateur ne voit que le message de la décision.';
comment on column public.moderation_activite.message is 'Le message du conseil syndical au créateur, à la publication, au refus ou au masquage ; `null` sans message.';

alter table public.moderation_activite enable row level security;

revoke all on public.moderation_activite from anon, authenticated;
grant select on public.moderation_activite to authenticated;

create policy "Le conseil syndical lit la modération des activités"
  on public.moderation_activite for select
  to authenticated
  using ((select public.est_syndic()));

/**
 * Vrai si la personne connectée peut lire une activité dans cet état : tout le monde la lit
 * publiée ou annulée ; en relecture ou masquée, seuls son créateur et le conseil syndical (comptes
 * qui peuvent consulter la résidence) la lisent.
 */
create function public.peut_voir_activite(
  p_statut public.statut_activite,
  p_organisateur uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_statut in ('publiee', 'annulee')
    or (
      public.peut_consulter()
      and (p_organisateur is not distinct from auth.uid() or public.est_syndic())
    );
$$;

revoke execute on function public.peut_voir_activite(public.statut_activite, uuid) from public;
grant execute on function public.peut_voir_activite(public.statut_activite, uuid) to anon, authenticated;

-- La lecture de la table respecte l'état de l'activité.
drop policy "Les comptes actifs consultent les activités" on public.activite;

create policy "Les comptes actifs consultent les activités visibles"
  on public.activite for select
  to authenticated
  using (
    (select public.peut_consulter())
    and public.peut_voir_activite(statut, organisateur)
  );

-- Les inscriptions d'une activité que la personne ne peut pas lire ne se lisent pas non plus.
drop policy "Un compte actif voit les inscriptions d'une activité qu'il consulte"
  on public.inscription_activite;

create policy "Un compte actif voit les inscriptions d'une activité qu'il consulte"
  on public.inscription_activite for select
  to authenticated
  using (
    (select public.peut_consulter())
    and exists (select 1 from public.activite a where a.id = activite_id)
  );

-- Le conseil syndical modifie toute activité, tant qu'elle n'est pas annulée. Le statut, lui, ne
-- se modifie jamais directement : il ne figure dans aucun droit d'écriture.
create policy "Le conseil syndical modifie toute activité non annulée"
  on public.activite for update
  to authenticated
  using ((select public.est_syndic()) and statut <> 'annulee')
  with check ((select public.est_syndic()));

/**
 * Met une activité publiée en relecture, avec la raison que lira le conseil syndical. Réservée à
 * son créateur (c'est ainsi que l'app applique l'avis de Jev, ticket #20) et au conseil syndical.
 * L'activité n'est plus visible que d'eux jusqu'à la décision du conseil syndical.
 */
create function public.mettre_en_relecture(p_identifiant text, p_raison text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible public.activite;
  raison text := nullif(trim(coalesce(p_raison, '')), '');
begin
  select * into cible
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if not (
    (cible.organisateur = auth.uid() and public.peut_participer()) or public.est_syndic()
  ) then
    raise exception 'Seuls le créateur et le conseil syndical mettent une activité en relecture'
      using errcode = '42501';
  end if;
  if raison is null then
    raise exception 'La mise en relecture demande une raison' using errcode = '23514';
  end if;
  if cible.statut <> 'publiee' then
    raise exception 'Seule une activité publiée se met en relecture' using errcode = 'P0011';
  end if;

  update public.activite set statut = 'en_relecture' where id = cible.id;
  insert into public.moderation_activite (activite_id, raison_relecture, message, decidee_le)
  values (cible.id, raison, null, null)
  on conflict (activite_id) do update
    set raison_relecture = excluded.raison_relecture, message = null, decidee_le = null;
end;
$$;

revoke execute on function public.mettre_en_relecture(text, text) from public, anon;
grant execute on function public.mettre_en_relecture(text, text) to authenticated;

/**
 * Décision du conseil syndical sur une activité : `publier` (publie une activité en relecture ou
 * rétablit une activité masquée) ou `masquer` (refuse une activité en relecture ou masque une
 * activité publiée). Le message, lu par le créateur, est obligatoire pour masquer. Une activité
 * annulée ne se modère plus.
 */
create function public.moderer_activite(
  p_identifiant text,
  p_decision text,
  p_message text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible public.activite;
  texte text := nullif(trim(coalesce(p_message, '')), '');
begin
  if not public.est_syndic() then
    raise exception 'Seul le conseil syndical modère les activités' using errcode = '42501';
  end if;
  if p_decision not in ('publier', 'masquer') then
    raise exception 'Décision inconnue : %', p_decision using errcode = '22023';
  end if;
  if p_decision = 'masquer' and texte is null then
    raise exception 'Masquer ou refuser une activité demande un message pour son créateur'
      using errcode = '23514';
  end if;

  select * into cible
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if cible.statut = 'annulee' then
    raise exception 'Une activité annulée ne se modère plus' using errcode = 'P0011';
  end if;

  update public.activite
  set statut = case p_decision when 'publier' then 'publiee' else 'masquee' end::public.statut_activite
  where id = cible.id;
  insert into public.moderation_activite (activite_id, message, decidee_le)
  values (cible.id, texte, now())
  on conflict (activite_id) do update set message = excluded.message, decidee_le = now();
end;
$$;

revoke execute on function public.moderer_activite(text, text, text) from public, anon;
grant execute on function public.moderer_activite(text, text, text) to authenticated;

/**
 * Les activités à modérer, pour le conseil syndical : d'abord celles en relecture (les plus
 * anciennes en tête) avec la raison de leur mise en relecture, puis les masquées avec le message
 * de leur masquage. Rien pour qui n'est pas du conseil syndical.
 */
create function public.activites_a_moderer()
returns table (
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  date_activite date,
  heure_debut time,
  lieu text,
  statut public.statut_activite,
  raison_relecture text,
  message_moderation text,
  organisateur_nom_affiche text,
  publiee_le timestamptz
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
    a.date_activite,
    a.heure_debut,
    a.lieu,
    a.statut,
    m.raison_relecture,
    m.message,
    public.nom_affiche(p.prenom, p.nom),
    a.publiee_le
  from public.activite a
  join public.profil p on p.id = a.organisateur
  left join public.moderation_activite m on m.activite_id = a.id
  where a.statut in ('en_relecture', 'masquee') and public.est_syndic()
  order by (a.statut = 'masquee'), a.publiee_le;
$$;

revoke execute on function public.activites_a_moderer() from public, anon;
grant execute on function public.activites_a_moderer() to authenticated;

-- Le conseil syndical annule aussi l'activité d'un résident. Une activité en relecture ou masquée
-- ne s'annule pas : une activité annulée est visible de tous, elle deviendrait publique. Il faut
-- d'abord la publier ou la rétablir.
create or replace function public.annuler_activite(p_identifiant text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cible public.activite;
begin
  select * into cible
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if not (
    (cible.organisateur is not distinct from auth.uid() and public.peut_participer())
    or public.est_syndic()
  ) then
    raise exception 'Seuls le créateur et le conseil syndical annulent une activité'
      using errcode = '42501';
  end if;
  if cible.statut in ('en_relecture', 'masquee') then
    raise exception 'Une activité en relecture ou masquée s''annule après sa publication'
      using errcode = 'P0011';
  end if;

  update public.activite set statut = 'annulee' where id = cible.id;
end;
$$;

-- Un retour ne se laisse pas sur une activité qu'on ne peut pas lire.
create or replace function public.laisser_retour(
  p_identifiant text,
  p_note smallint,
  p_commentaire text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_activite uuid;
  statut_actuel public.statut_activite;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut laisser un retour' using errcode = '42501';
  end if;

  select a.id, a.statut into id_activite, statut_actuel
  from public.activite a
  where a.identifiant_public = p_identifiant;
  if not found or statut_actuel in ('en_relecture', 'masquee') then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if statut_actuel = 'annulee' then
    raise exception 'Une activité annulée n''a pas eu lieu : elle n''accepte pas de retour'
      using errcode = 'P0004';
  end if;

  if not exists (
    select 1 from public.inscription_activite i
    where i.activite_id = id_activite and i.resident_id = (select auth.uid())
  ) then
    raise exception 'Seul un participant inscrit peut laisser un retour' using errcode = '42501';
  end if;

  if not public.activite_est_passee(id_activite) then
    raise exception 'L''activité n''est pas encore terminée' using errcode = 'P0003';
  end if;

  insert into public.retour (activite_id, resident_id, note, commentaire)
  values (id_activite, (select auth.uid()), p_note, trim(p_commentaire))
  on conflict (activite_id, resident_id) do update
    set note = excluded.note, commentaire = excluded.commentaire;
end;
$$;

-- Une activité qui n'est pas visible n'accepte pas d'inscription : elle est « introuvable ».
create or replace function public.s_inscrire(p_identifiant text, p_accompagnants smallint default 0)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  id_activite uuid;
  capacite_activite integer;
  statut_actuel public.statut_activite;
  total_places_prises integer;
begin
  if not public.peut_participer() then
    raise exception 'Seul un résident validé peut s''inscrire' using errcode = '42501';
  end if;
  if p_accompagnants < 0 then
    raise exception 'Le nombre d''accompagnants ne peut pas être négatif' using errcode = '23514';
  end if;

  select id, capacite_max, statut into id_activite, capacite_activite, statut_actuel
  from public.activite
  where identifiant_public = p_identifiant
  for update;
  if not found or statut_actuel in ('en_relecture', 'masquee') then
    raise exception 'Activité introuvable' using errcode = 'P0002';
  end if;
  if statut_actuel = 'annulee' then
    raise exception 'Cette activité est annulée' using errcode = 'P0004';
  end if;

  if capacite_activite is not null then
    select coalesce(sum(1 + i.accompagnants), 0) into total_places_prises
    from public.inscription_activite i
    where i.activite_id = id_activite;

    if total_places_prises + 1 + p_accompagnants > capacite_activite then
      raise exception 'Il ne reste pas assez de places' using errcode = 'P0003';
    end if;
  end if;

  insert into public.inscription_activite (activite_id, resident_id, accompagnants)
  values (id_activite, (select auth.uid()), p_accompagnants)
  on conflict (activite_id, resident_id) do update
    set accompagnants = excluded.accompagnants;
end;
$$;

-- Les participants d'une activité qu'on ne peut pas lire ne se lisent pas.
create or replace function public.participants_activite(identifiant text)
returns table (nom_affiche text, accompagnants smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select public.nom_affiche(p.prenom, p.nom), i.accompagnants
  from public.inscription_activite i
  join public.activite a on a.id = i.activite_id
  join public.profil p on p.id = i.resident_id
  where a.identifiant_public = identifiant
    and public.peut_consulter()
    and public.peut_voir_activite(a.statut, a.organisateur)
  order by i.inscrit_le;
$$;

-- Le catalogue ne montre ni activité en relecture ni activité masquée, sauf à son créateur.
create or replace function public.catalogue_activites()
returns table (
  id uuid,
  identifiant_public text,
  titre text,
  categorie public.categorie_activite,
  pictogramme text,
  date_activite date,
  heure_debut time,
  lieu text,
  capacite_max integer,
  places_prises integer,
  mes_accompagnants smallint,
  etiquettes public.etiquette_activite[],
  statut public.statut_activite,
  capacite_min integer,
  photo text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.identifiant_public,
    a.titre,
    a.categorie,
    a.pictogramme,
    a.date_activite,
    a.heure_debut,
    a.lieu,
    a.capacite_max,
    public.places_prises(a.id),
    (
      select i.accompagnants from public.inscription_activite i
      where i.activite_id = a.id and i.resident_id = auth.uid()
    ),
    a.etiquettes,
    a.statut,
    a.capacite_min,
    a.photos[1]
  from public.activite a
  where a.date_activite >= current_date
    and public.peut_consulter()
    and (
      a.statut = 'publiee'
      or a.organisateur = auth.uid()
      or (
        a.statut = 'annulee'
        and exists (
          select 1 from public.inscription_activite i
          where i.activite_id = a.id and i.resident_id = auth.uid()
        )
      )
    )
  order by a.date_activite, a.heure_debut;
$$;

-- La fiche ne livre ni activité en relecture ni activité masquée, sauf à son créateur et au
-- conseil syndical, et donne l'état de la modération : le message de la dernière décision (au
-- créateur et au conseil syndical) et la raison de la relecture (au conseil syndical seul).
drop function public.fiche_activite(text);

/**
 * La fiche d'une activité, lisible par tous à partir de son identifiant public, sauf en relecture
 * ou masquée (créateur et conseil syndical seuls). La jauge (places prises et capacité, `null` si
 * l'activité n'en a pas) est toujours donnée ; l'inscription et le retour de la personne connectée
 * ne sont donnés qu'à elle-même ; l'espace commun et ses consignes, qu'à un compte qui peut
 * consulter. Les photos sont publiques.
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
  consignes_espace text,
  photos text[],
  message_moderation text,
  raison_relecture text
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
    case when public.peut_consulter() then e.consignes end,
    a.photos,
    case
      when a.organisateur is not distinct from auth.uid() or public.est_syndic() then m.message
    end,
    case when public.est_syndic() then m.raison_relecture end
  from public.activite a
  join public.profil p on p.id = a.organisateur
  left join public.espace_commun e on e.id = a.espace_commun_id
  left join public.moderation_activite m on m.activite_id = a.id
  where a.identifiant_public = identifiant
    and public.peut_voir_activite(a.statut, a.organisateur);
$$;

revoke execute on function public.fiche_activite(text) from public;
grant execute on function public.fiche_activite(text) to anon, authenticated;
