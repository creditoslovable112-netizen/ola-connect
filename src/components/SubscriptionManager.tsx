import { useEffect, useState } from "react";
import { Check, Crown, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

type Plan = {
  id: string;
  slug: "starter" | "pro" | "elite";
  name: string;
  price_brl: number;
  features: string[];
  limits: Record<string, unknown>;
};

type Subscription = {
  id: string;
  status: string;
  checkout_url: string | null;
  current_period_end: string | null;
  plan: { name: string; slug: string; price_brl: number } | null;
};

const planDescriptions: Record<string, string> = {
  starter: "O essencial para organizar suas finanças.",
  pro: "Mais controle, relatórios e produtividade.",
  elite: "Inteligência e recursos avançados para crescer.",
};

const planIcons = { starter: ShieldCheck, pro: Sparkles, elite: Crown };

export function SubscriptionManager({ showNotice }: { showNotice: (message: string) => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [{ data: planRows, error: plansError }, { data: userData }] = await Promise.all([
        supabase.from("subscription_plans").select("id,slug,name,price_brl,features,limits").eq("is_active", true).order("display_order"),
        supabase.auth.getUser(),
      ]);
      if (plansError) showNotice("Não foi possível carregar os planos: " + plansError.message);
      const userId = userData.user?.id;
      let current: Subscription | null = null;
      if (userId) {
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("id,status,checkout_url,current_period_end,plan:subscription_plans(name,slug,price_brl)")
          .eq("user_id", userId)
          .in("status", ["pending", "authorized", "paused", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) showNotice("Não foi possível consultar sua assinatura: " + error.message);
        current = data as unknown as Subscription | null;
      }
      if (active) {
        setPlans((planRows || []) as Plan[]);
        setSubscription(current);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [showNotice]);

  const startCheckout = async (plan: Plan) => {
    setCheckingOut(plan.slug);
    try {
      const { data, error } = await supabase.functions.invoke("create-subscription", {
        body: { plan_slug: plan.slug },
      });
      if (error) throw error;
      if (!data?.checkout_url) throw new Error(data?.error || "O Mercado Pago não retornou o link de pagamento.");
      window.location.assign(data.checkout_url);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível iniciar o checkout.");
      setCheckingOut(null);
    }
  };

  const formatPrice = (value: number) =>
    Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) return <section className="panel payable-list-panel"><p>Carregando planos e assinatura...</p></section>;

  return (
    <div className="workspace-module subscription-page">
      <div className="welcome-row">
        <div><div className="eyebrow">NEXUS MEMBERSHIP</div><h1>Escolha seu plano</h1><p>Uma única plataforma. Recursos liberados conforme sua assinatura.</p></div>
      </div>
      {subscription && (
        <section className="panel subscription-current">
          <div><span className="eyebrow">SUA ASSINATURA</span><h2>{subscription.plan?.name || "NEXUS FINANCE"}</h2>
            <p>Status: <strong>{subscription.status === "authorized" ? "Ativa" : subscription.status === "pending" ? "Aguardando pagamento" : subscription.status === "paused" ? "Pausada" : "Em análise"}</strong>
              {subscription.current_period_end ? " · Próxima renovação: " + new Date(subscription.current_period_end).toLocaleDateString("pt-BR") : ""}
            </p></div>
          {subscription.status === "pending" && subscription.checkout_url && <a className="button-primary" href={subscription.checkout_url}>Continuar pagamento</a>}
        </section>
      )}
      <div className="subscription-plans">
        {plans.map((plan) => {
          const Icon = planIcons[plan.slug];
          const isCurrent = subscription?.plan?.slug === plan.slug && subscription.status === "authorized";
          return (
            <article className={"summary-card plan-card subscription-plan " + (plan.slug === "pro" ? "subscription-plan-featured" : "")} key={plan.id}>
              <div className="subscription-plan-heading"><span>PLANO {plan.slug.toUpperCase()}</span><Icon size={22}/></div>
              <h2>{plan.name.replace("NEXUS ", "")}</h2>
              <div className="subscription-price">{formatPrice(plan.price_brl)}<small>/mês</small></div>
              <p>{planDescriptions[plan.slug]}</p>
              <ul>{(plan.features || []).map((feature) => <li key={feature}><Check size={15}/>{feature}</li>)}</ul>
              <button
                className={plan.slug === "pro" ? "button-primary" : "button-secondary"}
                disabled={Boolean(checkingOut) || isCurrent || Boolean(subscription?.status === "authorized" && !isCurrent)}
                onClick={() => void startCheckout(plan)}
              >
                {checkingOut === plan.slug ? <><LoaderCircle size={15} className="spin"/> Abrindo checkout...</> : isCurrent ? "Plano atual" : subscription?.status === "authorized" ? "Cancele o plano atual primeiro" : "Assinar agora"}
              </button>
            </article>
          );
        })}
      </div>
      <div className="demo-disclaimer"><ShieldCheck size={14}/> Pagamento processado pelo Mercado Pago. O acesso Pro/Elite só será liberado após confirmação do webhook.</div>
    </div>
  );
}
