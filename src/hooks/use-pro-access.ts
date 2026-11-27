import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const PRO_ACCESS_REFRESH_MS = 60_000;

// The database owns status, plan, identity, workspace entitlement and expiry.
// Never infer access from provider, plan IDs, metadata or browser storage.
export function useProAccess(session: Session | null, surface: string) {
  const userId = session?.user.id;
  const token = session?.access_token;
  const [state, setState] = useState({ userId: "", allowed: false, loading: true, error: "" });

  useEffect(() => {
    if (!userId || !token) {
      setState({ userId: "", allowed: false, loading: false, error: "" });
      return;
    }
    let disposed = false;
    let generation = 0;
    setState({ userId, allowed: false, loading: true, error: "" });
    const refresh = async () => {
      const request = ++generation;
      try {
        const { data, error } = await supabase.rpc("has_active_pro_subscription");
        if (disposed || request !== generation) return;
        setState({ userId, allowed: !error && data === true, loading: false,
          error: error ? "Não foi possível verificar seu acesso PRO. Tente novamente em instantes." : "" });
      } catch {
        if (disposed || request !== generation) return;
        setState({ userId, allowed: false, loading: false,
          error: "Não foi possível verificar seu acesso PRO. Tente novamente em instantes." });
      }
    };
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, PRO_ACCESS_REFRESH_MS);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId, token, surface]);

  const sameUser = Boolean(userId && state.userId === userId);
  return {
    hasProAccess: sameUser && state.allowed,
    proAccessLoading: Boolean(userId) && (!sameUser || state.loading),
    proAccessError: sameUser ? state.error : "",
  };
}