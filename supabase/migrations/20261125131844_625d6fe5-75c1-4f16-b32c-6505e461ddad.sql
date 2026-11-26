CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare invited boolean := coalesce(new.raw_user_meta_data ->> 'nexus_workspace_invite_id', '') <> '';
begin
  if not invited and (new.raw_user_meta_data ->> 'terms_accepted' is distinct from 'true'
     or coalesce(new.raw_user_meta_data ->> 'terms_version', '') = ''
     or coalesce(new.raw_user_meta_data ->> 'privacy_version', '') = '') then
    raise exception 'É obrigatório aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.';
  end if;

  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'avatar_url', ''))
  on conflict (id) do nothing;

  -- Invited accounts accept the terms on first sign-in (legal gate in the app).
  if invited then return new; end if;

  insert into public.privacy_consents (user_id, purpose, granted, document_version, source)
  values
    (new.id, 'terms', true, new.raw_user_meta_data ->> 'terms_version', 'account_signup'),
    (new.id, 'privacy', true, new.raw_user_meta_data ->> 'privacy_version', 'account_signup'),
    (new.id, 'marketing', new.raw_user_meta_data ->> 'marketing_consent' = 'true', '1.0-2026-11-24', 'account_signup');

  if new.raw_user_meta_data ->> 'cookie_consent' in ('all', 'necessary') then
    insert into public.privacy_consents (user_id, purpose, granted, document_version, source)
    values (new.id, 'cookies', new.raw_user_meta_data ->> 'cookie_consent' = 'all', '1.0-2026-11-24', 'cookie_banner_signup');
  end if;
  return new;
end;
$function$;