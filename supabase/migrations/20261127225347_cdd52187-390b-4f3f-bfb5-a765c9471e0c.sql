BEGIN;
-- Reproduce the broken public bridge as an authenticated caller.
SELECT set_config('request.jwt.claim.sub', (SELECT user_id::text FROM public.user_subscriptions WHERE provider = 'manual' AND status = 'authorized' AND current_period_start <= now() AND current_period_end > now() ORDER BY created_at DESC LIMIT 1), true);
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  BEGIN
    PERFORM public.has_active_pro_subscription();
    RAISE EXCEPTION 'Expected the existing bridge to fail with insufficient private-schema privileges';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$test$;
RESET ROLE;
-- The fixed bridge executes only the existing identity-scoped private rule.
-- Do not grant private-schema access or change that rule or any RLS policy.
ALTER FUNCTION public.has_active_pro_subscription() SECURITY DEFINER;
ALTER FUNCTION public.has_active_pro_subscription() SET search_path = '';
REVOKE ALL ON FUNCTION public.has_active_pro_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_pro_subscription() TO authenticated, service_role;
SET LOCAL ROLE authenticated;
DO $test$
BEGIN
  IF public.has_active_pro_subscription() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'The authorized, current manual PRO subscription must be recognized';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000000', true);
  IF public.has_active_pro_subscription() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'A caller without subscription or workspace entitlement must remain blocked';
  END IF;
  PERFORM set_config('request.jwt.claim.sub', '', true);
  IF public.has_active_pro_subscription() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'An absent identity must remain blocked';
  END IF;
END;
$test$;
RESET ROLE;
DO $test$
BEGIN
  IF has_function_privilege('anon', 'public.has_active_pro_subscription()', 'execute') THEN
    RAISE EXCEPTION 'Anonymous execution must remain prohibited';
  END IF;
  IF has_schema_privilege('authenticated', 'private', 'usage') THEN
    RAISE EXCEPTION 'The private schema must remain inaccessible to authenticated callers';
  END IF;
END;
$test$;
COMMIT;