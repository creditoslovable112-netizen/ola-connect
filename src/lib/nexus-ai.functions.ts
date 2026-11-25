import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

type Msg = { role: "user" | "assistant"; text: string };

const SYSTEM = `Você é o NEXUS AI, assistente do NEXUS FINANCE, um app de gestão financeira para pequenas empresas e profissionais no Brasil.
Responda em português do Brasil, de forma clara, prática e objetiva (até ~250 palavras), usando listas quando ajudar.
Ajude com fluxo de caixa, contas a pagar/receber, categorias, centros de custo, precificação, reserva de emergência e planejamento.
Não peça nem aceite senhas, números de cartão, CPF ou dados bancários. Lembre que não substitui orientação contábil, jurídica ou financeira profissional quando o assunto exigir.`;

export const askNexusAI = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string; messages: Msg[] }) => {
    if (!input || typeof input.accessToken !== "string" || !Array.isArray(input.messages)) throw new Error("Pedido inválido.");
    const messages = input.messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      text: String(m.text ?? "").slice(0, 2000),
    }));
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || !last.text.trim() || last.text.length > 1200) throw new Error("Mensagem inválida.");
    return { accessToken: input.accessToken, messages };
  })
  .handler(async ({ data }) => {
    const url = process.env["VITE_SUPABASE_URL"] || "https://obaxshuklmrwjplvvhpd.supabase.co";
    const key = process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "sb_publishable_lVpoQYe9lwg2FQv_5xCjHQ_vsKOVa1u";
    const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: u, error: authErr } = await sb.auth.getUser(data.accessToken);
    if (authErr || !u.user) return { ok: false as const, error: "Entre na sua conta para usar o NEXUS AI." };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "O assistente não está configurado." };

    const { streamText, APICallError } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("../server/ai/gateway");
    const provider = createLovableAiGatewayProvider(apiKey, undefined, { baseURL: "https://ai.gateway.lovable.dev/v1" });
    try {
      const result = streamText({
        model: provider("google/gemini-4-argon"),
        system: SYSTEM,
        messages: data.messages.map((m) => ({ role: m.role, content: m.text })),
      });
      const text = (await result.text).trim();
      if (!text) return { ok: false as const, error: "O assistente não conseguiu responder a essa pergunta." };
      return { ok: true as const, reply: text };
    } catch (e) {
      const status = APICallError.isInstance(e) ? e.statusCode : undefined;
      console.error("nexus-ai error", status, e);
      if (status === 429) return { ok: false as const, error: "Muitas perguntas em pouco tempo. Aguarde um pouco e tente novamente." };
      if (status === 402) return { ok: false as const, error: "Os créditos de IA acabaram. Adicione créditos para continuar usando o NEXUS AI." };
      if (status === 403) return { ok: false as const, error: "O uso de IA está bloqueado nesta conta no momento." };
      return { ok: false as const, error: "Não consegui responder agora. Tente novamente em instantes." };
    }
  });
