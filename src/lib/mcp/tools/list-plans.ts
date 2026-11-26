import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { fetchPublicPlans, formatPlan } from "../plans";

export default defineTool({
  name: "list_plans",
  title: "Listar planos",
  description: "List the active subscription plans with monthly prices (BRL) and included features.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const plans = await fetchPublicPlans(ctx?.signal).catch(() => {
      throw new ToolError("Não foi possível carregar os planos agora.");
    });
    return {
      content: [{ type: "text", text: plans.map(formatPlan).join("\n\n") || "Nenhum plano ativo." }],
      structuredContent: { plans: plans.map((p) => ({ ...p, features: [...p.features] })) },
    };
  },
});
