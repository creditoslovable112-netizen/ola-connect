import type { Tables, TablesInsert, TablesUpdate } from "./database.types";
import { supabase } from "./supabase";

export type FinancialAccount = Tables<"financial_accounts">;
export type Category = Tables<"categories">;
export type CostCenter = Tables<"cost_centers">;
export type Transaction = Tables<"transactions">;
export type BusinessContact = Tables<"business_contacts">;
export type Company = Tables<"companies">;

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Entre na sua conta para acessar os dados financeiros.");
  return data.user.id;
}

/** The first active membership is the default workspace for financial screens. */
export async function requireWorkspaceId(): Promise<string> {
  const userId = await requireUserId();
  const { data, error } = await (supabase as any).from("workspace_members")
    .select("workspace_id").eq("user_id", userId).eq("status", "active")
    .order("joined_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.workspace_id) throw new Error("Sua conta ainda não possui um workspace ativo. Entre em contato com o administrador.");
  return data.workspace_id as string;
}

export async function listFinancialAccounts() {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("financial_accounts").select("*")
    .eq("workspace_id", workspace_id).eq("is_active", true).order("created_at", { ascending: false });
  if (error) throw error;
  return data as FinancialAccount[];
}
export async function createFinancialAccount(account: Omit<TablesInsert<"financial_accounts">, "user_id">) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("financial_accounts")
    .insert({ ...account, user_id, workspace_id }).select().single();
  if (error) throw error; return data as FinancialAccount;
}
export async function listCategories(type?: "income" | "expense") {
  const workspace_id = await requireWorkspaceId();
  let query = (supabase as any).from("categories").select("*").eq("workspace_id", workspace_id).order("name");
  if (type) query = query.eq("type", type);
  const { data, error } = await query; if (error) throw error; return data as Category[];
}
export async function createCategory(category: Omit<TablesInsert<"categories">, "user_id">) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("categories").insert({ ...category, user_id, workspace_id }).select().single();
  if (error) throw error; return data as Category;
}
export async function listCostCenters() {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("cost_centers").select("*").eq("workspace_id", workspace_id).order("name");
  if (error) throw error; return data as CostCenter[];
}
export async function createCostCenter(costCenter: Omit<TablesInsert<"cost_centers">, "user_id">) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("cost_centers").insert({ ...costCenter, user_id, workspace_id }).select().single();
  if (error) throw error; return data as CostCenter;
}
export async function listTransactions() {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("transactions").select("*")
    .eq("workspace_id", workspace_id).order("transaction_date", { ascending: false });
  if (error) throw error; return data as Transaction[];
}
export async function createTransaction(transaction: Omit<TablesInsert<"transactions">, "user_id">) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("transactions")
    .insert({ ...transaction, user_id, workspace_id }).select().single();
  if (error) throw error; return data as Transaction;
}
export async function updateTransaction(id: string, updates: TablesUpdate<"transactions">) {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("transactions").update(updates)
    .eq("id", id).eq("workspace_id", workspace_id).select().single();
  if (error) throw error; return data as Transaction;
}
export async function deleteTransaction(id: string) {
  const workspace_id = await requireWorkspaceId();
  const { error } = await (supabase as any).from("transactions").delete().eq("id", id).eq("workspace_id", workspace_id);
  if (error) throw error;
}
export async function listBusinessContacts(contactType?: "customer" | "supplier") {
  const workspace_id = await requireWorkspaceId();
  let query = (supabase as any).from("business_contacts").select("*").eq("workspace_id", workspace_id).order("name");
  if (contactType) query = query.eq("contact_type", contactType);
  const { data, error } = await query; if (error) throw error; return data as BusinessContact[];
}
export async function createBusinessContact(contact: Omit<TablesInsert<"business_contacts">, "user_id">) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("business_contacts").insert({ ...contact, user_id, workspace_id }).select().single();
  if (error) throw error; return data as BusinessContact;
}
export async function deleteBusinessContact(id: string) {
  const workspace_id = await requireWorkspaceId();
  const { error } = await (supabase as any).from("business_contacts").delete().eq("id", id).eq("workspace_id", workspace_id);
  if (error) throw error;
}
export async function listCompanies() {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("companies").select("*").eq("workspace_id", workspace_id).order("name");
  if (error) throw error; return data as Company[];
}
export async function createCompany(company: Omit<TablesInsert<"companies">, "user_id">) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("companies").insert({ ...company, user_id, workspace_id }).select().single();
  if (error) throw error; return data as Company;
}
export async function deleteCompany(id: string) {
  const workspace_id = await requireWorkspaceId();
  const { error } = await (supabase as any).from("companies").delete().eq("id", id).eq("workspace_id", workspace_id);
  if (error) throw error;
}
