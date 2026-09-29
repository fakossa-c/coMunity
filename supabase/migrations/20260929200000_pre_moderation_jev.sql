-- Pré-modération de Jev, sans fenêtre publique ni contournement (ticket #101).
--
-- Avant : l'app insérait l'activité en `publiee`, puis appelait Jev, puis la mettait en relecture.
-- Pendant l'appel (jusqu'à 3 s) elle était publique, un créateur qui écrit dans `activite` avec sa
-- session évitait Jev, et une modification n'était jamais relue.
--
-- Désormais, tout ce qu'un compte connecté écrit dans `activite` est mis de côté par la base :
--   - une activité insérée naît `en_relecture` ;
--   - une activité publiée que son créateur modifie repasse `en_relecture`.
-- Le serveur, seul à tenir la clé secrète, écoute Jev puis appelle `conclure_pre_moderation` :
-- sans objection de Jev l'activité est publiée, sinon elle reste en relecture avec la raison que
-- lira le conseil syndical. Un créateur ne peut donc pas se publier lui-même, et un arrêt du
-- processus entre les deux laisse l'activité chez son créateur et le conseil syndical, jamais
-- chez tous.
--
-- Migration additive : une fonction, un déclencheur. Rien n'est retiré ni renommé : le code de
-- `main` (qui insère puis appelle `mettre_en_relecture`) continue de fonctionner sur cette base,
-- si ce n'est que ses activités neuves y attendent le conseil syndical tant que `develop` n'est pas
-- fusionné.

/**
 * Met de côté ce qu'un compte connecté écrit : une insertion naît en relecture, la modification par
 * son créateur d'une activité publiée la remet en relecture. Ne s'applique qu'au rôle
 * `authenticated` (la clé publiable et la session) : la clé secrète du serveur, les fonctions de
 * la base et le SQL direct gardent la main sur le statut. Une modification qui ne change rien, ou
 * celle du conseil syndical sur l'activité d'un autre (il modère lui-même), ne relit rien.
 */
create function public.garder_pre_moderation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.statut := 'en_relecture';
  elsif old.statut = 'publiee'
    and new.statut = 'publiee'
    and old.organisateur is not distinct from auth.uid()
    and new is distinct from old then
    new.statut := 'en_relecture';
  end if;
  return new;
end;
$$;

revoke execute on function public.garder_pre_moderation() from public, anon, authenticated;

create trigger activite_pre_moderation
  before insert or update on public.activite
  for each row
  execute function public.garder_pre_moderation();

/**
 * Conclut la pré-modération d'une activité que Jev vient de lire (à la création ou à la
 * modification) : sans raison, elle est publiée ; avec une raison, elle reste en relecture et le
 * conseil syndical la lit. Réservée au serveur (clé secrète) : c'est lui qui a entendu Jev.
 * Ne touche qu'une activité qui attend cet avis, jamais une publiée, une masquée ou une activité
 * que le conseil syndical a déjà à relire (raison donnée, décision pas encore prise).
 */
create function public.conclure_pre_moderation(p_identifiant text, p_raison text default null)
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
  if cible.statut <> 'en_relecture'
    or exists (
      select 1 from public.moderation_activite m
      where m.activite_id = cible.id
        and m.raison_relecture is not null
        and m.decidee_le is null
    ) then
    raise exception 'Cette activité n''attend pas l''avis de Jev' using errcode = 'P0011';
  end if;

  if raison is null then
    update public.activite set statut = 'publiee' where id = cible.id;
  else
    insert into public.moderation_activite (activite_id, raison_relecture, message, decidee_le)
    values (cible.id, raison, null, null)
    on conflict (activite_id) do update
      set raison_relecture = excluded.raison_relecture, message = null, decidee_le = null;
  end if;
end;
$$;

revoke execute on function public.conclure_pre_moderation(text, text) from public, anon, authenticated;
grant execute on function public.conclure_pre_moderation(text, text) to service_role;
