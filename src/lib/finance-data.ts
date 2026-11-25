import type { Tables, TablesInsert, TablesUpdate } from "./database.types";
import { supabase } from "./supabase";

export type FinancialAccount = Tables<"financial_accounts"> & { company_id?: string | null };
export type Category = Tables<"categories">;
export type CostCenter = Tables<"cost_centers">;
export type Transaction = Tables<"transactions"> & { company_id?: string | null };
export type BusinessContact = Tables<"business_contacts"> & { company_id?: string | null };
export type Company = Tables<"companies"> & { state_registration?: string | null; postal_code?: string | null; street_address?: string | null; address_number?: string | null; address_complement?: string | null; neighborhood?: string | null; city?: string | null; state?: string | null; logo_url?: string | null; };

export function getActiveCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem("nexus-active-company");
  return value && value !== "all" ? value : null;
}
function scopedToCompany(query: any) {
  const companyId = getActiveCompanyId();
  return companyId ? query.eq("company_id", companyId) : query;
}

export async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("Entre na sua conta para acessar os dados financeiros.");
  return data.user.id;
}
export async function requireWorkspaceId(): Promise<string> {
  const userId = await requireUserId();
  const preferred = typeof window !== "undefined" ? window.localStorage.getItem("nexus-active-workspace") : null;
  let query = (supabase as any).from("workspace_members").select("workspace_id").eq("user_id", userId).eq("status", "active");
  if (preferred) query = query.eq("workspace_id", preferred); else query = query.order("joined_at", { ascending: false });
  let { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.workspace_id && preferred) {
    window.localStorage.removeItem("nexus-active-workspace");
    const fallback = await (supabase as any).from("workspace_members").select("workspace_id").eq("user_id", userId).eq("status", "active").order("joined_at", { ascending: false }).limit(1).maybeSingle();
    data = fallback.data; error = fallback.error; if (error) throw error;
  }
  if (!data?.workspace_id) throw new Error("Sua conta ainda não possui um workspace ativo. Entre em contato com o administrador.");
  return data.workspace_id as string;
}
export async function listFinancialAccounts() {
  const workspace_id = await requireWorkspaceId();
  let query = (supabase as any).from("financial_accounts").select("*").eq("workspace_id", workspace_id).eq("is_active", true);
  query = scopedToCompany(query).order("created_at", { ascending: false });
  const { data, error } = await query; if (error) throw error; return data as FinancialAccount[];
}
export async function createFinancialAccount(account: Omit<TablesInsert<"financial_accounts">, "user_id"> & { company_id?: string | null }) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("financial_accounts").insert({ ...account, company_id: account.company_id ?? getActiveCompanyId(), user_id, workspace_id }).select().single();
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
  let query = (supabase as any).from("transactions").select("*").eq("workspace_id", workspace_id);
  query = scopedToCompany(query).order("transaction_date", { ascending: false });
  const { data, error } = await query; if (error) throw error; return data as Transaction[];
}
export async function createTransaction(transaction: Omit<TablesInsert<"transactions">, "user_id"> & { company_id?: string | null }) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("transactions").insert({ ...transaction, company_id: transaction.company_id ?? getActiveCompanyId(), user_id, workspace_id }).select().single();
  if (error) throw error; return data as Transaction;
}
export async function updateTransaction(id: string, updates: TablesUpdate<"transactions">) {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("transactions").update(updates).eq("id", id).eq("workspace_id", workspace_id).select().single();
  if (error) throw error; return data as Transaction;
}
export async function deleteTransaction(id: string) {
  const workspace_id = await requireWorkspaceId();
  const { error } = await (supabase as any).from("transactions").delete().eq("id", id).eq("workspace_id", workspace_id);
  if (error) throw error;
}
export async function listBusinessContacts(contactType?: "customer" | "supplier", includeAllCompanies = false) {
  const workspace_id = await requireWorkspaceId();
  let query = (supabase as any).from("business_contacts").select("*").eq("workspace_id", workspace_id);
  if (!includeAllCompanies) query = scopedToCompany(query);
  if (contactType) query = query.eq("contact_type", contactType);
  const { data, error } = await query.order("name"); if (error) throw error; return data as BusinessContact[];
}
export async function listSupplierCompanyLinks() {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("company_suppliers").select("supplier_id,company_id").eq("workspace_id", workspace_id);
  if (error) throw error; return data as { supplier_id: string; company_id: string }[];
}
export async function saveSupplierCompanyLinks(supplierId: string, companyIds: string[]) {
  const workspace_id = await requireWorkspaceId();
  const { error: deleteError } = await (supabase as any).from("company_suppliers").delete().eq("workspace_id", workspace_id).eq("supplier_id", supplierId);
  if (deleteError) throw deleteError;
  if (companyIds.length) {
    const { error } = await (supabase as any).from("company_suppliers").insert(companyIds.map(company_id => ({ workspace_id, supplier_id: supplierId, company_id })));
    if (error) throw error;
  }
}
export async function listSupplierTransactions(supplierId: string) {
  const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("transactions")
    .select("id,description,amount,status,due_date,paid_at,transaction_date,company_id,type")
    .eq("workspace_id", workspace_id).eq("supplier_id", supplierId).eq("type", "expense")
    .order("transaction_date", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function createBusinessContact(contact: Omit<TablesInsert<"business_contacts">, "user_id"> & { company_id?: string | null }) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("business_contacts").insert({ ...contact, company_id: contact.company_id ?? getActiveCompanyId(), user_id, workspace_id }).select().single();
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
export async function createCompany(company: Omit<TablesInsert<"companies">, "user_id"> & Record<string, unknown>) {
  const user_id = await requireUserId(); const workspace_id = await requireWorkspaceId();
  const { data, error } = await (supabase as any).from("companies").insert({ ...company, user_id, workspace_id }).select().single();
  if (error) throw error; return data as Company;
}
export async function deleteCompany(id: string) {
  const workspace_id = await requireWorkspaceId();
  const { error } = await (supabase as any).from("companies").delete().eq("id", id).eq("workspace_id", workspace_id);
  if (error) throw error;
}
