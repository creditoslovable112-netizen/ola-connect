import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Server configuration is incomplete." }, 503);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    if (body?.action === "status") {
      return json({ configured: Boolean(Deno.env.get("GEMINI_API_KEY")) });
    }

    const action = body?.action === "analyze-finances" ? "analyze-finances" : "chat";
    let message = typeof body?.message === "string" ? body.message.trim() : "";
    if (action === "chat" && !message) return json({ error: "Escreva uma pergunta para o NEXUS AI." }, 400);
    if (message.length > 1200) return json({ error: "A mensagem excede 1.200 caracteres." }, 413);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) return json({ error: "AI_NOT_CONFIGURED" }, 503);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (action === "analyze-finances") {
      const { data: hasPro, error: proError } = await authClient.rpc("has_active_pro_subscription");
      if (proError || !hasPro) return json({ error: "A análise financeira com IA é um recurso do NEXUS PRO." }, 403);
    }
    const { data: allowed, error: quotaError } = await admin.rpc("consume_nexus_ai_quota", {
      p_user_id: userData.user.id,
    });
    if (quotaError) {
      console.error("NEXUS AI quota check failed:", quotaError.message);
      return json({ error: "Não foi possível validar o limite de uso." }, 503);
    }
    if (!allowed) return json({ error: "Você atingiu o limite gratuito de 30 perguntas por dia. Tente novamente amanhã." }, 429);

    if (action === "analyze-finances") {
      const environment = body?.environment === "personal" ? "personal" : "business";
      const months = [3, 6, 12].includes(Number(body?.period_months)) ? Number(body.period_months) : 6;
      const startDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      let transactions: any[] = [];
      let openingBalance = 0;
      let categories: Record<string, string> = {};
      let extra: Record<string, unknown> = {};

      if (environment === "personal") {
        const [tx, financing, payments, goals] = await Promise.all([
          authClient.from("personal_transactions").select("type,amount,status,transaction_date,due_date,category").eq("user_id", userData.user.id).gte("transaction_date", startDate).limit(5000),
          authClient.from("personal_financings").select("id,total_amount,is_active").eq("user_id", userData.user.id).eq("is_active", true),
          authClient.from("personal_financing_payments").select("financing_id,amount").eq("user_id", userData.user.id),
          authClient.from("personal_financial_goals").select("name,target_amount,current_amount,target_date").eq("user_id", userData.user.id)
        ]);
        if (tx.error || financing.error || payments.error || goals.error) return json({ error: "Não foi possível ler todos os dados pessoais para a análise." }, 403);
        transactions = tx.data ?? [];
        const paidByFinancing = new Map<string, number>();
        for (const payment of payments.data ?? []) paidByFinancing.set(payment.financing_id, (paidByFinancing.get(payment.financing_id) ?? 0) + Number(payment.amount));
        const debt = (financing.data ?? []).reduce((sum: number, item: any) => sum + Math.max(0, Number(item.total_amount) - (paidByFinancing.get(item.id) ?? 0)), 0);
        const goalRows = goals.data ?? [];
        extra = { estimated_financing_balance: debt, savings_goals: { count: goalRows.length, target_total: goalRows.reduce((sum: number, goal: any) => sum + Number(goal.target_amount), 0), saved_total: goalRows.reduce((sum: number, goal: any) => sum + Number(goal.current_amount), 0), deadlines_within_30_days: goalRows.filter((goal: any) => goal.target_date && goal.target_date >= today && goal.target_date <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10)).length } };
      } else {
        const workspaceId = typeof body?.workspace_id === "string" ? body.workspace_id : "";
        if (!workspaceId) return json({ error: "Workspace não informado para a análise empresarial." }, 400);
        const { data: membership, error: membershipError } = await authClient.from("workspace_members").select("role").eq("workspace_id", workspaceId).eq("user_id", userData.user.id).eq("status", "active").maybeSingle();
        if (membershipError || !membership) return json({ error: "Você não tem acesso a este workspace." }, 403);
        const companyId = typeof body?.company_id === "string" && body.company_id ? body.company_id : "";
        if (companyId) {
          const { data: company, error: companyError } = await authClient.from("companies").select("id").eq("id", companyId).eq("workspace_id", workspaceId).maybeSingle();
          if (companyError || !company) return json({ error: "A empresa selecionada não pertence ao seu workspace." }, 403);
        }
        let txQuery = authClient.from("transactions").select("type,amount,status,transaction_date,due_date,paid_at,category_id").eq("workspace_id", workspaceId).gte("transaction_date", startDate).limit(5000);
        if (companyId) txQuery = txQuery.eq("company_id", companyId);
        const [tx, accountQuery, categoryQuery, payrollQuery] = await Promise.all([
          txQuery,
          (() => { let q = authClient.from("financial_accounts").select("opening_balance").eq("workspace_id", workspaceId); return companyId ? q.eq("company_id", companyId) : q; })(),
          authClient.from("categories").select("id,name").eq("workspace_id", workspaceId),
          (() => { let q = authClient.from("personnel_expenses").select("amount,status,due_date,paid_at").eq("workspace_id", workspaceId); return companyId ? q.eq("company_id", companyId) : q; })()
        ]);
        if (tx.error || accountQuery.error || categoryQuery.error) return json({ error: "Não foi possível ler os dados financeiros do workspace." }, 403);
        transactions = tx.data ?? [];
        openingBalance = (accountQuery.data ?? []).reduce((sum: number, item: any) => sum + Number(item.opening_balance), 0);
        categories = Object.fromEntries((categoryQuery.data ?? []).map((item: any) => [item.id, item.name]));
        extra = { personnel_expenses: payrollQuery.error ? [] : payrollQuery.data ?? [] };
      }

      const paid = transactions.filter(item => item.status === "paid");
      const pending = transactions.filter(item => item.status === "pending" || item.status === "overdue");
      const sum = (rows: any[], type: string) => rows.filter(item => item.type === type).reduce((total, item) => total + Number(item.amount), 0);
      const monthly = new Map<string, { income: number; expense: number }>();
      const categoryTotals = new Map<string, number>();
      for (const item of paid) {
        const key = String(item.paid_at ?? item.transaction_date ?? "").slice(0, 7);
        if (!key) continue;
        const month = monthly.get(key) ?? { income: 0, expense: 0 };
        if (item.type === "income") month.income += Number(item.amount);
        if (item.type === "expense") {
          month.expense += Number(item.amount);
          const category = environment === "personal" ? String(item.category || "Sem categoria") : categories[item.category_id] || "Sem categoria";
          categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + Number(item.amount));
        }
        monthly.set(key, month);
      }
      const overdue = pending.filter(item => item.due_date && item.due_date < today);
      const payroll = Array.isArray((extra as any).personnel_expenses) ? (extra as any).personnel_expenses : [];
      const paidPayroll = payroll.filter((item: any) => item.status === "paid").reduce((sum: number, item: any) => sum + Number(item.amount), 0);
      const pendingPayroll = payroll.filter((item: any) => item.status === "pending").reduce((sum: number, item: any) => sum + Number(item.amount), 0);
      const summary = {
        environment, period_months: months, from: startDate, to: today,
        totals: {
          income: sum(paid, "income"),
          expenses: sum(paid, "expense") + paidPayroll,
          net_result: sum(paid, "income") - sum(paid, "expense") - paidPayroll,
          pending_income: sum(pending, "income"),
          pending_expenses: sum(pending, "expense") + pendingPayroll,
          overdue_count: overdue.length,
          overdue_amount: overdue.reduce((total, item) => total + Number(item.amount), 0),
          estimated_cash_balance: openingBalance + sum(paid, "income") - sum(paid, "expense") - paidPayroll
        },
        monthly: Array.from(monthly.entries()).sort(([a],[b])=>a.localeCompare(b)).map(([month, values])=>({ month, ...values, result: values.income-values.expense })),
        expense_categories: Array.from(categoryTotals.entries()).map(([category, amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount).slice(0,8),
        ...extra
      };
      message = "Analise estes dados financeiros agregados do usuário. Não invente valores nem fatos; diferencie dados observados de hipóteses. Identifique tendências, riscos de caixa, despesas que merecem atenção, vencimentos e até cinco ações práticas priorizadas. Explique que projeções dependem da qualidade dos lançamentos. Não dê aconselhamento fiscal, jurídico ou de investimento personalizado. Responda em português brasileiro, com títulos curtos e valores em reais. Dados (JSON): " + JSON.stringify(summary);
    }

    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
    const upstream = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "Você é o NEXUS AI, assistente em português do Brasil especializado em educação financeira geral, organização empresarial, orçamento, fluxo de caixa, conceitos contábeis e planejamento. Responda com clareza, objetividade e passos práticos. Em perguntas comuns, não afirme acessar contas ou transações. Na ação de análise financeira, use exclusivamente o resumo agregado de dados anexado à solicitação; não alegue acesso a lançamentos individuais nem invente valores. Nunca solicite senhas, códigos, CPF completo, dados bancários ou números de cartão. Não invente números, leis ou garantias. Para decisões fiscais, jurídicas ou investimentos personalizados, recomende um profissional habilitado. Mantenha respostas concisas e úteis."
          }]
        },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 650, thinkingConfig: { thinkingLevel: "low" } },
      }),
    });

    if (!upstream.ok) {
      const status = upstream.status;
      console.error("Gemini provider returned status:", status);
      if (status === 429) return json({ error: "Limite gratuito temporário do provedor atingido. Aguarde e tente novamente." }, 429);
      return json({ error: "O provedor gratuito não conseguiu processar a pergunta. Verifique a chave e tente novamente." }, 502);
    }

    const result = await upstream.json();
    const reply = result?.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("")
      .trim();
    if (!reply) return json({ error: "O assistente não retornou texto. Tente reformular a pergunta." }, 502);

    return json({ reply, remainingToday: null });
  } catch (error) {
    console.error("NEXUS AI request failed:", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Erro interno ao consultar o assistente." }, 500);
  }
});