import { useId } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDashboardMotion } from "../hooks/use-dashboard-motion";

const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// These views consume existing dashboard totals and series; they never fetch or seed data.
export function FinanceDistribution({ income, expense, caption }: { income: number; expense: number; caption: string }) {
  const animate = useDashboardMotion();
  const total = income + expense;
  const segments = [
    { name: "Receitas", value: income, color: "var(--dashboard-income)" },
    { name: "Despesas", value: expense, color: "var(--dashboard-expense)" },
  ];
  return <section className="finance-distribution">
    <div className="finance-section-heading"><h2>Receitas × despesas</h2><p>{caption}</p></div>
    {total > 0 ? <>
      <div className="finance-donut" role="img" aria-label={`Receitas: ${money(income)}. Despesas: ${money(expense)}.`}>
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={segments} dataKey="value" nameKey="name" innerRadius="72%" outerRadius="92%" paddingAngle={3} stroke="var(--dashboard-surface)" strokeWidth={3} isAnimationActive={animate} animationDuration={650}>{segments.map(segment => <Cell key={segment.name} fill={segment.color}/>)}</Pie><Tooltip formatter={value => money(Number(value))}/></PieChart></ResponsiveContainer>
        <div className="finance-donut-center"><span>Total movimentado</span><strong>{money(total)}</strong></div>
      </div>
      <div className="finance-distribution-legend">{segments.map(segment => <div key={segment.name}><span><i className={segment.name === "Receitas" ? "finance-dot-income" : "finance-dot-expense"}/>{segment.name}</span><strong>{money(segment.value)}</strong><small>{(segment.value / total * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small></div>)}</div>
    </> : <p className="finance-empty">Nenhuma receita ou despesa paga neste período.</p>}
  </section>;
}

export function FinanceEvolution({ data, mode = "both" }: { data: { month: string; receitas: number; despesas: number }[]; mode?: "both" | "income" | "expense" }) {
  const animate = useDashboardMotion();
  const id = useId().replace(/:/g, "");
  const visible = data.some(item => (mode !== "expense" && item.receitas !== 0) || (mode !== "income" && item.despesas !== 0));
  return <>
    <div className="finance-evolution" role="img" aria-label="Evolução mensal de receitas e despesas pagas">
      {visible ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 15, right: 12, left: 0, bottom: 0 }}>
        <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--dashboard-coral)" stopOpacity={0.22}/><stop offset="100%" stopColor="var(--dashboard-coral)" stopOpacity={0.01}/></linearGradient></defs>
        <CartesianGrid stroke="var(--dashboard-border)" vertical={false} strokeDasharray="3 5"/>
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--dashboard-muted)" }} axisLine={false} tickLine={false} minTickGap={18}/>
        <YAxis width={52} tick={{ fontSize: 10, fill: "var(--dashboard-muted)" }} axisLine={false} tickLine={false} tickFormatter={value => Math.abs(Number(value)) >= 1000 ? (Number(value) / 1000).toLocaleString("pt-BR") + " mil" : String(value)}/>
        <Tooltip formatter={value => money(Number(value))}/>
        {mode !== "expense" && <Area type="monotone" dataKey="receitas" name="Receitas" stroke="var(--dashboard-coral)" fill={`url(#${id}-fill)`} strokeWidth={2.5} isAnimationActive={animate} animationDuration={650}/>}
        {mode !== "income" && <Area type="monotone" dataKey="despesas" name="Despesas" stroke="var(--dashboard-expense)" strokeDasharray="5 4" fill="none" strokeWidth={2} isAnimationActive={animate} animationDuration={650}/>}
      </AreaChart></ResponsiveContainer> : <p className="finance-empty">Nenhuma movimentação paga no período selecionado.</p>}
    </div>
    <div className="finance-chart-legend">{mode !== "expense" && <span><i className="finance-dot-coral"/> Receitas pagas</span>}{mode !== "income" && <span><i className="finance-dot-expense"/> Despesas pagas</span>}</div>
  </>;
}