const SUPABASE_URL = "https://obaxshuklmrwjplvvhpd.supabase.co";
const PUBLISHABLE_KEY = "sb_publishable_lVpoQYe9lwg2FQv_5xCjHQ_vsKOVa1u";

export interface PublicPlan {
  slug: string;
  name: string;
  price_brl: number;
  currency: string;
  billing_interval: string;
  features: string[];
}

/** Reads only active plans through the public key; RLS already allows anonymous reads. */
export async function fetchPublicPlans(signal?: AbortSignal): Promise<PublicPlan[]> {
  const url = `${SUPABASE_URL}/rest/v1/subscription_plans?select=slug,name,price_brl,currency,billing_interval,features&is_active=eq.true&order=display_order`;
  const res = await fetch(url, { headers: { apikey: PUBLISHABLE_KEY }, ...(signal ? { signal } : {}) });
  if (!res.ok) throw new Error(`Plans request failed (${res.status})`);
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    slug: String(r["slug"]),
    name: String(r["name"]),
    price_brl: Number(r["price_brl"]),
    currency: String(r["currency"]),
    billing_interval: String(r["billing_interval"]),
    features: Array.isArray(r["features"]) ? r["features"].map(String) : [],
  }));
}

export const formatPlan = (p: PublicPlan) =>
  `${p.name} (${p.slug}): R$ ${p.price_brl.toFixed(2).replace(".", ",")}/${p.billing_interval === "month" ? "mês" : p.billing_interval}\n  - ${p.features.join("\n  - ")}`;
