import { useEffect, useState } from "react";
import { Check, Clock3, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

type Plan = {
  id: string;
  slug: "pro";
  name: string;
  price_brl: number;
  features: string[];
  limits: Record<string, unknown>;
};

type Subscription = {
  id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  plan: { name: string; slug: string; price_brl: number } | null;
};

const planDescriptions: Record<string, string> = {
  pro: "Todos os recursos financeiros do NEXUS em um único plano mensal.",
};

export function SubscriptionManager({ showNotice }: { showNotice: (message: string) => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [{ data: planRows, error: plansError }, { data: userData }, { data: accessData, error: accessError }] = await Promise.all([
        supabase.from("subscription_plans").select("id,slug,name,price_brl,features,limits").eq("slug", "pro").eq("is_active", true).order("display_order"),
        supabase.auth.getUser(),
        supabase.rpc("has_active_pro_subscription"),
      ]);
      if (plansError) showNotice("Não foi possível carregar o plano: " + plansError.message);
      if (accessError) showNotice("Não foi possível validar o acesso PRO: " + accessError.message);
      const userId = userData.user?.id;
      let current: Subscription | null = null;
      if (userId) {
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("id,status,current_period_start,current_period_end,plan:subscription_plans(name,slug,price_brl)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) showNotice("Não foi possível consultar sua assinatura: " + error.message);
        current = data as unknown as Subscription | null;
      }
      if (active) {
        setPlans((planRows || []) as Plan[]);
        setSubscription(current);
        setHasProAccess(!accessError && accessData === true);
        setLoading(false);
      }
    })().catch((error) => {
      if (active) {
        showNotice(error instanceof Error ? error.message : "Não foi possível consultar a assinatura.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [showNotice]);

  const formatPrice = (value: number) =>
    Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const statusLabel = (status: string | undefined) => {
    if (status === "authorized") return "Pagamento confirmado";
    if (status === "pending") return "Aguardando pagamento";
    if (status === "paused") return "Pausada";
    if (status === "cancelled") return "Cancelada";
    if (status === "past_due") return "Pagamento em atraso";
    if (status === "expired") return "Expirada";
    return "Sem assinatura ativa";
  };

  if (loading) return <section className="panel payable-list-panel"><p>Verificando sua assinatura mensal...</p></section>;

  return (
    <div className="workspace-module subscription-page">
      <div className="welcome-row">
        <div><div className="eyebrow">NEXUS MEMBERSHIP</div><h1>NEXUS PRO</h1><p>Um plano completo para sua gestão financeira.</p></div>
      </div>
      <section className="panel subscription-current">
        <div>
          <span className="eyebrow">STATUS DO ACESSO</span>
          <h2>{hasProAccess ? "NEXUS PRO desbloqueado" : "Recursos PRO bloqueados"}</h2>
          <p>Status: <strong>{hasProAccess ? "Assinatura mensal ativa" : statusLabel(subscription?.status)}</strong>
            {subscription?.current_period_end ? " · Válida até " + new Date(subscription.current_period_end).toLocaleDateString("pt-BR") : ""}
          </p>
          {!hasProAccess && <p>A assinatura só libera os módulos depois que o provedor confirmar o pagamento e registrar o período vigente.</p>}
        </div>
        {hasProAccess ? <span className="subscription-access-ok"><Check size={16}/> Acesso liberado</span> : <span className="subscription-access-pending"><LockKeyhole size={16}/> Aguardando ativação</span>}
      </section>
      <div className="subscription-plans">
        {plans.map((plan) => (
          <article className="summary-card plan-card subscription-plan subscription-plan-featured" key={plan.id}>
            <div className="subscription-plan-heading"><span>PLANO MENSAL</span><Sparkles size={22}/></div>
            <h2>{plan.name.replace("NEXUS ", "")}</h2>
            <div className="subscription-price">{formatPrice(plan.price_brl)}<small>/mês</small></div>
            <p>{planDescriptions[plan.slug]}</p>
            <ul>{(plan.features || []).map((feature) => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
            <button className="button-primary" type="button" disabled>
              <Clock3 size={15}/> Integração de assinatura em preparação
            </button>
          </article>
        ))}
      </div>
      <div className="demo-disclaimer"><ShieldCheck size={14}/> A integração com a Cakto será conectada em uma próxima etapa. Nenhum pagamento é simulado e nenhum acesso é liberado manualmente nesta tela.</div>
    </div>
  );
}
