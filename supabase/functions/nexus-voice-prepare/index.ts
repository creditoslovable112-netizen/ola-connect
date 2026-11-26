import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Entre na sua conta para usar o NEXUS VOZ." }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!url || !anon || !service || !apiKey) return json({ error: "O NEXUS VOZ ainda não está configurado no servidor." }, 503);
    const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userError } = await auth.auth.getUser();
    if (userError || !userData.user) return json({ error: "Sessão inválida. Entre novamente." }, 401);
    const body = await req.json().catch(() => ({}));
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "Diga ou escreva o que deseja registrar." }, 400);
    if (message.length > 1200) return json({ error: "O pedido pode ter no máximo 1.200 caracteres." }, 413);

    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: allowed, error: quotaError } = await admin.rpc("consume_nexus_ai_quota", { p_user_id: userData.user.id });
    if (quotaError) return json({ error: "Não foi possível validar o limite diário do assistente." }, 503);
    if (!allowed) return json({ error: "Você atingiu o limite diário de 30 usos do assistente." }, 429);

    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";
    const upstream = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: [
          "Você é o interpretador do NEXUS VOZ. Responda SOMENTE JSON válido, sem markdown.",
          "Você NÃO executa ações. Apenas interpreta o pedido para uma tela de confirmação humana.",
          "Nesta versão, as ações permitidas são registrar transações de receita/despesa e acrescentar valor acumulado a uma meta financeira existente.",
          "Se o usuário pedir reservar/acrescentar dinheiro a uma meta, use type=goal_contribution com amount e goal_name se informado; não transforme reserva em despesa. Se pedir transferir dinheiro entre contas, pagar boleto, fazer saque, movimentar banco, alterar assinatura, cadastrar/editar/excluir outros registros, navegar ou qualquer outra ação não permitida, retorne supported=false. Se a meta não estiver identificada, goal_name=null para o usuário escolher na confirmação.",
          "Se houver ambiguidade, valor ausente, descrição insuficiente, ou mistura com ação não suportada, retorne supported=false e faça uma pergunta clara. Não retorne ações parciais.",
          "Quando a pessoa disser gastei, paguei ou comprei, status=paid. Para vou pagar, preciso pagar ou conta a pagar, status=pending. Não invente data, categoria ou conta.",
          "Converta valores falados para número decimal em reais. Cada despesa/receita vira um item separado. Não crie itens que não foram pedidos.",
          "Formato exato: {supported:boolean, clarification:string|null, actions:[{type:'expense'|'income'|'goal_contribution',description:string,amount:number,counterparty:string|null,status:'paid'|'pending',category_name:string|null,goal_name:string|null}]}",
          "Se não houver pedido válido, use supported=false, actions=[] e clarification explicativa.",
          "Limite de 10 ações; amount deve ser maior que zero; description curta. category_name só preencha se estiver explícita no pedido; caso contrário null."
        ].join(" ") }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 700, responseMimeType: "application/json" }
      })
    });
    if (!upstream.ok) return json({ error: upstream.status === 429 ? "O limite temporário do assistente foi atingido. Tente novamente." : "Não foi possível interpretar o pedido agora." }, 502);
    const result = await upstream.json();
    const raw = result?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("").trim();
    if (!raw) return json({ error: "O assistente não retornou uma interpretação. Tente reformular." }, 502);
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return json({ error: "Não consegui organizar esse pedido com segurança. Tente falar de outro jeito." }, 422); }
    if (typeof parsed.supported !== "boolean" || !Array.isArray(parsed.actions)) return json({ error: "A interpretação não passou pela validação de segurança." }, 422);
    if (!parsed.supported) return json({ supported: false, clarification: typeof parsed.clarification === "string" ? parsed.clarification : "Esse pedido ainda não está disponível no NEXUS VOZ.", actions: [] });
    if (parsed.actions.length < 1 || parsed.actions.length > 10) return json({ error: "A quantidade de lançamentos não é válida." }, 422);
    const actions = [];
    for (const item of parsed.actions) {
      if (!item || !["expense", "income", "goal_contribution"].includes(item.type) || typeof item.description !== "string" || !item.description.trim() || item.description.length > 160 || typeof item.amount !== "number" || !Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 100000000 || (item.type !== "goal_contribution" && !["paid", "pending"].includes(item.status))) {
        return json({ error: "Um dos lançamentos não passou pela validação. Reformule o pedido." }, 422);
      }
      actions.push({
        type: item.type,
        description: item.description.trim(),
        amount: Math.round(item.amount * 100) / 100,
        counterparty: typeof item.counterparty === "string" ? item.counterparty.slice(0, 120) : null,
        status: item.status,
        category_name: typeof item.category_name === "string" ? item.category_name.slice(0, 80) : null,
        goal_name: typeof item.goal_name === "string" ? item.goal_name.slice(0, 120) : null,
      });
    }
    return json({ supported: true, clarification: null, actions });
  } catch (error) {
    console.error("NEXUS VOZ prepare error:", error instanceof Error ? error.message : "unknown");
    return json({ error: "Erro interno ao preparar o pedido." }, 500);
  }
});
