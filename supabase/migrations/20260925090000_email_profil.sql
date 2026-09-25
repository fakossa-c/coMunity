-- Changement d'adresse email : le profil garde une copie de l'adresse, que l'espace syndic affiche.
-- Supabase ne change `auth.users.email` qu'une fois le lien de confirmation ouvert ; la copie suit alors.
create function public.suivre_email_du_compte()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profil set email = new.email where id = new.id;
  return new;
end;
$$;

revoke execute on function public.suivre_email_du_compte() from public, anon, authenticated;

create trigger suivre_email_du_compte
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.suivre_email_du_compte();
