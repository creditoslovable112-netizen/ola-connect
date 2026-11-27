create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.validate_nexus_reminder_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    p_token is not null
    and exists (
      select 1
      from vault.decrypted_secrets
      where name = 'nexus_reminder_cron_token'
        and decrypted_secret = p_token
    ),
    false
  );
$$;

revoke all on function public.validate_nexus_reminder_token(text) from public, authenticated;
grant execute on function public.validate_nexus_reminder_token(text) to anon;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets
    where name = 'nexus_reminder_cron_token'
  ) then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'nexus_reminder_cron_token',
      'Internal authentication token for the NEXUS daily reminder scheduler'
    );
  end if;
end
$$;
