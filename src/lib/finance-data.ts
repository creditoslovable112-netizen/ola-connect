import type { Tables, TablesInsert, TablesUpdate } from "./database.types";
import { supabase } from "./supabase";

export type FinancialAccount = Tables<"financial_accounts">;
export type Category = Tables<"categories">;
export type CostCenter = Tables<"cost_centers">;
export type Transaction = Tables<"transactions">;

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Entre na sua conta para acessar os dados financeiros.");
  return data.user.id;
}

export async function listFinancialAccounts() {
  const { data, error } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("user_id", await requireUserId())
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createFinancialAccount(
  account: Omit<TablesInsert<"financial_accounts">, "user_id">,
) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("financial_accounts")
    .insert({ ...account, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCategories(type?: "income" | "expense") {
  let query = supabase.from("categories").select("*").eq("user_id", await requireUserId()).order("name");
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createCategory(
  category: Omit<TablesInsert<"categories">, "user_id">,
) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...category, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listCostCenters() {
  const { data, error } = await supabase
    .from("cost_centers")
    .select("*")
    .eq("user_id", await requireUserId())
    .order("name");
  if (error) throw error;
  return data;
}

export async function createCostCenter(
  costCenter: Omit<TablesInsert<"cost_centers">, "user_id">,
) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("cost_centers")
    .insert({ ...costCenter, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listTransactions() {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", await requireUserId())
    .order("transaction_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTransaction(
  transaction: Omit<TablesInsert<"transactions">, "user_id">,
) {
  const user_id = await requireUserId();
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...transaction, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTransaction(
  id: string,
  updates: TablesUpdate<"transactions">,
) {
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .eq("user_id", await requireUserId())
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", await requireUserId());
  if (error) throw error;
}


export type BusinessContact = Tables<"business_contacts">;
export type Company = Tables<"companies">;

export async function listBusinessContacts(contactType?: "customer" | "supplier") {
  let query = supabase.from("business_contacts").select("*").eq("user_id", await requireUserId()).order("name");
  if (contactType) query = query.eq("contact_type", contactType);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createBusinessContact(contact: Omit<TablesInsert<"business_contacts">, "user_id">) {
  const user_id = await requireUserId();
  const { data, error } = await supabase.from("business_contacts").insert({ ...contact, user_id }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteBusinessContact(id: string) {
  const { error } = await supabase.from("business_contacts").delete().eq("id", id).eq("user_id", await requireUserId());
  if (error) throw error;
}

export async function listCompanies() {
  const { data, error } = await supabase.from("companies").select("*").eq("user_id", await requireUserId()).order("name");
  if (error) throw error;
  return data;
}

export async function createCompany(company: Omit<TablesInsert<"companies">, "user_id">) {
  const user_id = await requireUserId();
  const { data, error } = await supabase.from("companies").insert({ ...company, user_id }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(id: string) {
  const { error } = await supabase.from("companies").delete().eq("id", id).eq("user_id", await requireUserId());
  if (error) throw error;
}
