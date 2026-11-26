import { supabase } from "./supabase";
import type { Tables } from "./database.types";

export const TERMS_VERSION = "1.0-2026-11-24";
export const PRIVACY_VERSION = "1.0-2026-11-24";
export const MARKETING_VERSION = "1.0-2026-11-24";
export const COOKIE_VERSION = "1.0-2026-11-24";

export type PrivacyConsent = Tables<"privacy_consents">;
export type PrivacyRequest = Tables<"privacy_requests">;

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Entre na sua conta para continuar.");
  return data.user.id;
}

export async function listMyPrivacyConsents() {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("privacy_consents").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function recordMyConsent(
  purpose: "terms" | "privacy" | "marketing" | "cookies",
  granted: boolean,
  version: string,
  source = "privacy_center",
) {
  const userId = await currentUserId();
  const { error } = await supabase.from("privacy_consents").insert({
    user_id: userId, purpose, granted, document_version: version, source,
  });
  if (error) throw error;
}

export async function submitPrivacyRequest(
  requestType: "access" | "deletion" | "correction" | "portability" | "other",
  description: string,
) {
  const userId = await currentUserId();
  const { error } = await supabase.from("privacy_requests").insert({
    user_id: userId, request_type: requestType, description: description.trim() || null,
  });
  if (error) throw error;
}

export async function listMyPrivacyRequests() {
  const userId = await currentUserId();
  const { data, error } = await supabase.from("privacy_requests").select("*")
    .eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
