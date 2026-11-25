import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fetchPublicPlans, formatPlan } from "../plans";

export default defineTool({
  name: "get_plan",
  title: "Detalhes do plano",
  description: "Get price and features of one subscription plan by slug (e.g. starter, pro, elite).",
  inputSchema: { slug: z.string().min(1).describe("Plan slug, e.g. starter, pro or elite.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    const plans = await fetchPublicPlans(ctx?.signal).catch(() => {
      throw new ToolError("Não foi possível carregar os planos agora.");
    });
    const plan = plans.find((p) => p.slug === slug.toLowerCase());
    if (!plan) throw new ToolError(`Plano desconhecido. Opções: ${plans.map((p) => p.slug).join(", ")}`);
    return {
      content: [{ type: "text", text: formatPlan(plan) }],
      structuredContent: { plan: { ...plan, features: [...plan.features] } },
    };
  },
});
