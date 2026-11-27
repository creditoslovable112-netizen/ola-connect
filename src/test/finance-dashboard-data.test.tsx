import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalFinance } from "../components/PersonalFinance";
import { SupabaseDashboard } from "../components/SupabaseFinancialModules";

const source = vi.hoisted(() => ({
  transactions: [] as Record<string, unknown>[],
  personal: [] as Record<string, unknown>[],
  distribution: vi.fn((_props: { income: number; expense: number }) => null),
  evolution: vi.fn((_props: { data: { month: string; receitas: number; despesas: number }[] }) => null),
}));

vi.mock("../components/FinanceDashboardCharts", () => ({
  FinanceDistribution: source.distribution,
  FinanceEvolution: source.evolution,
}));
vi.mock("../lib/finance-data", async importOriginal => ({
  ...await importOriginal<typeof import("../lib/finance-data")>(),
  listFinancialAccounts: async () => [],
  listCategories: async () => [],
  listCostCenters: async () => [],
  listTransactions: async () => source.transactions,
  listCompanies: async () => [],
  listBusinessContacts: async () => [],
  listSupplierCompanyLinks: async () => [],
  listCustomerCompanyLinks: async () => [],
  requireWorkspaceId: async () => { throw new Error("No realtime connection in this test"); },
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      type Query = Promise<{ data: Record<string, unknown>[]; error: null }> & {
        select: () => Query; eq: () => Query; order: () => Query; limit: () => Query;
      };
      const query = Promise.resolve({ data: table === "personal_transactions" ? source.personal : [], error: null });
      const chain: Query = Object.assign(query, {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      });
      return chain;
    },
  },
}));

const notice = vi.fn();
const currentDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`;
};
const entry = (id: string, type: string, amount: number, status = "paid") => ({
  id, type, amount, status, description: id, category: null, category_id: null,
  account_id: null, counterparty: null, paid_at: null, due_date: null, transaction_date: currentDate(),
});

beforeEach(() => { source.transactions = []; source.personal = []; vi.clearAllMocks(); });
afterEach(cleanup);

describe("Existing dashboard query results feed the shared charts", () => {
  it("keeps enterprise monthly paid amounts and excludes pending and cancelled records", async () => {
    // Fixtures exist only in tests; no demonstration records are added to the app.
    source.transactions = [entry("income", "income", 1250), entry("expense", "expense", 340), entry("pending", "expense", 900, "pending"), entry("cancelled", "income", 800, "cancelled")];
    render(<SupabaseDashboard showNotice={notice}/>);
    await waitFor(() => expect(source.distribution).toHaveBeenCalled());
    expect(source.distribution.mock.calls.at(-1)?.[0]).toMatchObject({ income: 1250, expense: 340 });
    const rows = source.evolution.mock.calls.at(-1)?.[0].data;
    expect(rows).toHaveLength(6);
    expect(rows?.at(-1)).toMatchObject({ receitas: 1250, despesas: 340 });
    expect(rows?.slice(0, -1).every(row => row.receitas === 0 && row.despesas === 0)).toBe(true);
  });

  it("keeps personal paid totals and only trims existing month rows when changing chart period", async () => {
    source.personal = [entry("income", "income", 2700), entry("expense", "expense", 650), entry("pending", "income", 1100, "pending")];
    render(<PersonalFinance showNotice={notice}/>);
    await waitFor(() => expect(source.evolution).toHaveBeenCalled());
    expect(source.distribution.mock.calls.at(-1)?.[0]).toMatchObject({ income: 2700, expense: 650 });
    const sixMonths = source.evolution.mock.calls.at(-1)?.[0].data;
    expect(sixMonths).toHaveLength(6);
    expect(sixMonths?.at(-1)).toMatchObject({ receitas: 2700, despesas: 650 });
    fireEvent.change(screen.getByRole("combobox", { name: "Período da evolução pessoal" }), { target: { value: "3" } });
    expect(source.evolution.mock.calls.at(-1)?.[0].data).toEqual(sixMonths?.slice(-3));
    expect(source.distribution.mock.calls.at(-1)?.[0]).toMatchObject({ income: 2700, expense: 650 });
  });

  it("does not substitute invented values for empty query results", async () => {
    render(<PersonalFinance showNotice={notice}/>);
    await waitFor(() => expect(source.distribution).toHaveBeenCalled());
    expect(source.distribution.mock.calls.at(-1)?.[0]).toMatchObject({ income: 0, expense: 0 });
    const rows = source.evolution.mock.calls.at(-1)?.[0].data;
    expect(rows).toHaveLength(6);
    expect(rows?.every(row => row.receitas === 0 && row.despesas === 0)).toBe(true);
  });
});