-- La table `retour` n'est lisible par personne en direct. L'auteur lit son avis sur la fiche
-- (`mon_retour_note` de `fiche_activite`), une activité à la fois ; la liste Activités › Archivées
-- (#128) a besoin de savoir, pour toutes ses lignes à la fois, lesquelles ont déjà un avis.
-- `mes_retours` rend à la personne connectée la note de ses propres avis, rien d'autre : ni le
-- commentaire, ni l'avis d'un autre. Migration additive : aucune fonction existante ne change.

create function public.mes_retours()
returns table (activite_id uuid, note smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.activite_id, r.note
  from public.retour r
  where r.resident_id = (select auth.uid());
$$;

comment on function public.mes_retours() is 'La note des avis déjà laissés par la personne connectée, une ligne par activité ; sans commentaire, sans avis des autres.';

revoke execute on function public.mes_retours() from public, anon;
grant execute on function public.mes_retours() to authenticated;
