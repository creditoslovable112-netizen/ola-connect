ALTER FUNCTION public.prevent_workspace_record_reassignment() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.bootstrap_nexus_workspace() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_workspace_role(uuid, text[]) TO authenticated, service_role;
CREATE POLICY "No direct client access to AI usage" ON public.nexus_ai_usage AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);