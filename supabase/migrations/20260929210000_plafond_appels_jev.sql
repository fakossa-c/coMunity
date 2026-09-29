-- Plafond des appels à Jev par compte (ticket #100).
--
-- Chaque appel à Jev est un appel OpenRouter payant, et rien ne bornait leur nombre : un compte
-- connecté pouvait marteler l'action serveur qui le déclenche. Le serveur, seul à tenir la clé
-- secrète, réserve désormais un appel auprès de la base avant de l'émettre :
--   - 10 appels par heure et par compte pour la création d'une activité ;
--   - 10 appels par heure et par compte pour sa modification (un budget séparé) ;
--   - 30 appels par jour et par compte, toutes actions confondues.
-- Un refus ne bloque rien côté résident : le serveur se passe de Jev, comme quand Jev est en panne.
--
-- Le compteur est en base plutôt qu'en mémoire du serveur : Vercel lance autant d'instances qu'il
-- veut, et chacune aurait son propre compte. Une ligne par appel réservé, purgée au-delà de 24
-- heures, donne les deux fenêtres glissantes avec le même mécanisme.
--
-- Migration additive : une table et une fonction nouvelles, que seul le code de `develop` appelle.
-- Le code de `main`, qui tourne sur la même base, n'y touche pas et n'en est pas modifié.

create table public.appel_jev (
  id bigint generated always as identity primary key,
  compte_id uuid not null references auth.users (id) on delete cascade,
  action text not null check (action in ('creation', 'modification')),
  appele_le timestamptz not null default now()
);

comment on table public.appel_jev is 'Un appel à Jev réservé par le serveur pour un compte (`reserver_appel_jev`) : de quoi tenir les plafonds par heure et par jour. Purgée au-delà de 24 heures.';

create index appel_jev_par_compte on public.appel_jev (compte_id, appele_le desc);
create index appel_jev_par_date on public.appel_jev (appele_le);

-- Aucune politique : ni lecture ni écriture avec la clé publiable ou une session. Seules les
-- fonctions de la base et la clé secrète du serveur y accèdent.
alter table public.appel_jev enable row level security;
revoke all on public.appel_jev from anon, authenticated;

/**
 * Réserve un appel à Jev pour un compte : vrai et l'appel est compté, ou faux quand un plafond
 * est atteint (un refus ne compte rien). Le compte est verrouillé le temps de la réservation :
 * deux requêtes simultanées ne dépassent jamais le plafond. Réservée au serveur (clé secrète).
 */
create function public.reserver_appel_jev(p_compte uuid, p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  par_heure constant int := 10;
  par_jour constant int := 30;
begin
  if p_action not in ('creation', 'modification') then
    raise exception 'Action inconnue' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_compte::text, 0));

  delete from public.appel_jev where appele_le < now() - interval '1 day';

  if (
    select count(*) from public.appel_jev
    where compte_id = p_compte and action = p_action and appele_le > now() - interval '1 hour'
  ) >= par_heure
  or (
    select count(*) from public.appel_jev
    where compte_id = p_compte
  ) >= par_jour then
    return false;
  end if;

  insert into public.appel_jev (compte_id, action) values (p_compte, p_action);
  return true;
end;
$$;

revoke execute on function public.reserver_appel_jev(uuid, text) from public, anon, authenticated;
grant execute on function public.reserver_appel_jev(uuid, text) to service_role;
