import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Plus, RefreshCw, Target, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { getActiveCompanyId, requireWorkspaceId } from "../lib/finance-data";

type FinancialGoal = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  notes: string | null;
  company_id: string | null;
};

type Notice = (message: string) => void;
const money = (value: number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinancialGoals({ showNotice }: { showNotice: Notice }) {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [progressDrafts, setProgressDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const workspaceId = await requireWorkspaceId();
      let query = (supabase as any).from("financial_goals").select("id,name,target_amount,current_amount,target_date,notes,company_id")
        .eq("workspace_id", workspaceId).order("target_date", { ascending: true, nullsFirst: false });
      const companyId = getActiveCompanyId();
      if (companyId) query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      const rows = (data ?? []) as FinancialGoal[];
      setGoals(rows);
      setProgressDrafts(Object.fromEntries(rows.map(goal => [goal.id, String(goal.current_amount)])));
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível carregar as metas.");
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

  useEffect(() => { void load(); }, [load]);

  const createGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const target = Number(targetAmount);
    const current = Number(currentAmount);
    if (!name.trim() || !Number.isFinite(target) || target <= 0 || !Number.isFinite(current) || current < 0 || current > target) {
      showNotice("Confira o nome e os valores da meta. O progresso deve ficar entre zero e o valor-alvo.");
      return;
    }
    setSaving(true);
    try {
      const [{ data: userData, error: userError }, workspaceId] = await Promise.all([supabase.auth.getUser(), requireWorkspaceId()]);
      if (userError) throw userError;
      if (!userData.user) throw new Error("Entre na sua conta para cadastrar uma meta.");
      const { error } = await (supabase as any).from("financial_goals").insert({
        workspace_id: workspaceId, user_id: userData.user.id, company_id: getActiveCompanyId(),
        name: name.trim(), target_amount: target, current_amount: current,
        target_date: targetDate || null, notes: notes.trim() || null,
      });
      if (error) throw error;
      setName(""); setTargetAmount(""); setCurrentAmount("0"); setTargetDate(""); setNotes("");
      await load();
      showNotice("Meta financeira salva.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível salvar a meta.");
    } finally { setSaving(false); }
  };

  const saveProgress = async (goal: FinancialGoal) => {
    const amount = Number(progressDrafts[goal.id]);
    if (!Number.isFinite(amount) || amount < 0 || amount > Number(goal.target_amount)) {
      showNotice("O progresso deve ficar entre zero e o valor-alvo.");
      return;
    }
    try {
      const workspaceId = await requireWorkspaceId();
      const { error } = await (supabase as any).from("financial_goals").update({ current_amount: amount })
        .eq("id", goal.id).eq("workspace_id", workspaceId);
      if (error) throw error;
      await load();
      showNotice("Progresso da meta atualizado.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível atualizar o progresso.");
    }
  };

  const deleteGoal = async (goal: FinancialGoal) => {
    if (!window.confirm(`Excluir a meta "${goal.name}"?`)) return;
    try {
      const workspaceId = await requireWorkspaceId();
      const { error } = await (supabase as any).from("financial_goals").delete().eq("id", goal.id).eq("workspace_id", workspaceId);
      if (error) throw error;
      await load();
      showNotice("Meta excluída.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Não foi possível excluir a meta.");
    }
  };

  return <section className="financial-goals-page">
    <div className="welcome-row"><div><div className="eyebrow">PLANEJAMENTO · NEXUS PRO</div><h1>Metas financeiras</h1><p>Defina objetivos e acompanhe o progresso registrado pela sua equipe.</p></div><Target size={28}/></div>
    <form className="panel financial-goal-form" onSubmit={createGoal}>
      <h2><Plus size={17}/> Nova meta</h2>
      <div className="financial-goal-fields">
        <label>Nome da meta<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Reserva de emergência"/></label>
        <label>Valor-alvo (R$)<input required type="number" min="0.01" step="0.01" value={targetAmount} onChange={event => setTargetAmount(event.target.value)} placeholder="10000,00"/></label>
        <label>Valor acumulado (R$)<input type="number" min="0" step="0.01" value={currentAmount} onChange={event => setCurrentAmount(event.target.value)}/></label>
        <label>Data desejada<input type="date" value={targetDate} onChange={event => setTargetDate(event.target.value)}/></label>
      </div>
      <label>Observações<textarea rows={2} maxLength={500} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Detalhes opcionais da meta"/></label>
      <button className="button-primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar meta"}</button>
      <small>Os valores acumulados são informados e atualizados pela equipe; não são estimativas automáticas.</small>
    </form>
    <div className="financial-goals-heading"><h2>Suas metas</h2><button className="button-secondary" onClick={() => void load()}><RefreshCw size={14}/> Atualizar</button></div>
    {loading ? <div className="panel"><p>Carregando metas...</p></div> : goals.length === 0 ? <div className="panel financial-goals-empty"><Target size={24}/><strong>Nenhuma meta cadastrada</strong><p>Cadastre uma meta para começar a acompanhar seus objetivos financeiros.</p></div> :
      <div className="financial-goals-list">{goals.map(goal => {
        const progress = Math.min(100, Math.round(Number(goal.current_amount) / Number(goal.target_amount) * 100));
        return <article className="panel financial-goal-card" key={goal.id}>
          <div className="financial-goal-card-head"><div><h3>{goal.name}</h3>{goal.target_date && <small><CalendarDays size={13}/> Prazo: {new Date(goal.target_date + "T12:00:00").toLocaleDateString("pt-BR")}</small>}</div><button className="icon-button" aria-label={`Excluir meta ${goal.name}`} onClick={() => void deleteGoal(goal)}><Trash2 size={16}/></button></div>
          {goal.notes && <p>{goal.notes}</p>}
          <div className="financial-goal-amounts"><strong>{money(Number(goal.current_amount))}</strong><span>de {money(Number(goal.target_amount))}</span><b>{progress}%</b></div>
          <div className="financial-goal-progress"><i style={{ width: progress + "%" }}/></div>
          <div className="financial-goal-update"><label>Atualizar valor acumulado<input type="number" min="0" max={Number(goal.target_amount)} step="0.01" value={progressDrafts[goal.id] ?? String(goal.current_amount)} onChange={event => setProgressDrafts(current => ({ ...current, [goal.id]: event.target.value }))}/></label><button className="button-secondary" onClick={() => void saveProgress(goal)}>Atualizar progresso</button></div>
        </article>;
      })}</div>}
  </section>;
}
