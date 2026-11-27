-- Keep the scheduler's token validator unavailable to public API clients.
-- The Edge Function now calls it with the service-role key.
revoke all on function public.validate_nexus_reminder_token(text) from public, anon, authenticated;
grant execute on function public.validate_nexus_reminder_token(text) to service_role;
