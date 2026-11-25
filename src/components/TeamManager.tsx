import { useCallback, useEffect, useState, type FormEvent } from "react";
import { UserPlus, Users, ShieldCheck, RefreshCw, Trash2, Mail, Building2 } from "lucide-react";
import { supabase } from "../lib/supabase";

type Workspace = { id: string; name: string; owner_id: string };
type Member = { id: string; user_id: string; role: "owner"|"admin"|"editor"|"viewer"; status: string; joined_at: string; email: string|null };
type Invite = { id: string; email: string; role: "admin"|"editor"|"viewer"; expires_at: string };
type Props = { showNotice: (message: string) => void };
const roleLabel: Record<string,string> = { owner:"Proprietário", admin:"Administrador", editor:"Editor", viewer:"Visualizador" };

export function TeamManager({ showNotice }: Props) {
  const [workspaces,setWorkspaces]=useState<Workspace[]>([]);
  const [workspaceId,setWorkspaceId]=useState("");
  const [myRole,setMyRole]=useState("");
  const [members,setMembers]=useState<Member[]>([]);
  const [invites,setInvites]=useState<Invite[]>([]);
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<"admin"|"editor"|"viewer">("editor");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const canManage=myRole==="owner"||myRole==="admin";

  const load=useCallback(async (selected?:string) => {
    setLoading(true);
    try {
      await supabase.functions.invoke("team-management",{body:{action:"accept"}});
      const {data:{user},error:userError}=await supabase.auth.getUser();
      if(userError||!user) throw userError??new Error("Faça login novamente.");
      const {data:rows,error}=await (supabase as any).from("workspace_members")
        .select("workspace_id,role,workspaces(id,name,owner_id)").eq("user_id",user.id).eq("status","active").order("joined_at",{ascending:false});
      if(error) throw error;
      const mapped=(rows??[]).map((r:any)=>({id:r.workspaces?.id,name:r.workspaces?.name??"Workspace",owner_id:r.workspaces?.owner_id,role:r.role})).filter((w:any)=>w.id);
      setWorkspaces(mapped);
      const target=selected&&mapped.some((w:any)=>w.id===selected)?selected:(mapped[0]?.id??"");
      setWorkspaceId(target);
      if (target) window.localStorage.setItem("nexus-active-workspace", target);
      const ownRole=mapped.find((w:any)=>w.id===target)?.role??"";
      setMyRole(ownRole);
      if(!target){setMembers([]);setInvites([]);return;}
      const {data:teamData,error:teamError}=await supabase.functions.invoke("team-management",{body:{action:"list",workspace_id:target}});
      if(teamError) throw teamError;
      if(teamData?.error) throw new Error(teamData.error);
      setMembers(teamData.members??[]);setInvites(teamData.invites??[]);
    } catch(e) { showNotice(e instanceof Error?e.message:"Não foi possível carregar a equipe."); }
    finally { setLoading(false); }
  },[showNotice]);

  useEffect(()=>{void load();},[load]);
  const refresh=()=>void load(workspaceId);
  const invite=async(e:FormEvent)=>{e.preventDefault();if(!workspaceId)return;setSaving(true);
    try{const {data,error}=await supabase.functions.invoke("team-management",{body:{action:"invite",workspace_id:workspaceId,email,role}});
      if(error)throw error;if(data?.error)throw new Error(data.error);
      showNotice(data.message??"Convite registrado.");setEmail("");await load(workspaceId);
    }catch(err){showNotice(err instanceof Error?err.message:"Falha ao convidar membro.");}finally{setSaving(false);}
  };
  const manage=async(action:string,payload:Record<string,string>)=>{if(!workspaceId)return;
    try{const {data,error}=await supabase.functions.invoke("team-management",{body:{action,workspace_id:workspaceId,...payload}});
      if(error)throw error;if(data?.error)throw new Error(data.error);showNotice("Equipe atualizada.");await load(workspaceId);
    }catch(err){showNotice(err instanceof Error?err.message:"Não foi possível atualizar a equipe.");}
  };

  return <div className="team-page">
    <div className="welcome-row"><div><div className="eyebrow">GESTÃO · ACESSO COMPARTILHADO</div><h1>Equipe</h1><p>Convide colaboradores para trabalhar nos mesmos dados financeiros do workspace.</p></div><button className="button-secondary" onClick={refresh} disabled={loading}><RefreshCw size={15}/> Atualizar</button></div>
    {workspaces.length>1&&<label className="team-workspace-select"><Building2 size={16}/> Workspace<select value={workspaceId} onChange={e=>void load(e.target.value)}>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}
    {loading?<div className="panel">Carregando membros reais…</div>:!workspaceId?<div className="panel"><h2>Nenhum workspace disponível</h2><p>Sua conta ainda não possui um espaço de trabalho ativo.</p></div>:<>
      <section className="team-summary-grid"><article className="metric-card"><div className="metric-top">Membros ativos <Users size={17}/></div><div className="metric-value">{members.filter(m=>m.status==="active").length}</div><div className="metric-foot">Contas reais com acesso</div></article><article className="metric-card"><div className="metric-top">Convites pendentes <Mail size={17}/></div><div className="metric-value">{invites.length}</div><div className="metric-foot">Aguardando aceite</div></article><article className="metric-card"><div className="metric-top">Sua permissão <ShieldCheck size={17}/></div><div className="metric-value team-role-value">{roleLabel[myRole]??"Membro"}</div><div className="metric-foot">No workspace selecionado</div></article></section>
      {canManage&&<section className="panel team-invite-panel"><div><h2>Convidar colaborador</h2><p>O convite usa o e-mail real da pessoa e libera acesso após autenticação e aceite.</p></div><form onSubmit={invite} className="team-invite-form"><label>E-mail<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="nome@empresa.com"/></label><label>Permissão<select value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="editor">Editor — pode cadastrar e alterar dados</option><option value="viewer">Visualizador — somente leitura</option><option value="admin">Administrador — gerencia equipe</option></select></label><button className="button-primary" type="submit" disabled={saving}><UserPlus size={16}/>{saving?"Enviando…":"Enviar convite"}</button></form></section>}
      <section className="panel team-list-panel"><div className="team-list-heading"><div><h2>Membros da equipe</h2><p>Somente usuários autenticados e autorizados.</p></div></div>
        {members.map(m=><div className="team-member-row" key={m.id}><div className="team-member-avatar">{(m.email??"U").slice(0,2).toUpperCase()}</div><div className="team-member-copy"><strong>{m.email??"Conta autenticada"}</strong><small>{m.user_id===members.find(x=>x.role==="owner")?.user_id?"Proprietário do workspace":roleLabel[m.role]}</small></div>
          {canManage&&m.role!=="owner"&&<><select aria-label={"Permissão de "+m.email} value={m.role} onChange={e=>void manage("change_role",{user_id:m.user_id,role:e.target.value})}><option value="admin">Administrador</option><option value="editor">Editor</option><option value="viewer">Visualizador</option></select><button className="icon-button team-remove" title="Remover membro" onClick={()=>{if(window.confirm("Remover o acesso deste membro ao workspace?"))void manage("remove_member",{user_id:m.user_id});}}><Trash2 size={16}/></button></>}
          {!canManage&&<span className="team-role-pill">{roleLabel[m.role]}</span>}
        </div>)}
        {members.length===0&&<p className="team-empty">Nenhum membro encontrado no workspace.</p>}
      </section>
      {canManage&&invites.length>0&&<section className="panel team-list-panel"><h2>Convites pendentes</h2>{invites.map(i=><div className="team-member-row" key={i.id}><div className="team-member-avatar"><Mail size={16}/></div><div className="team-member-copy"><strong>{i.email}</strong><small>{roleLabel[i.role]} · expira em {new Date(i.expires_at).toLocaleDateString("pt-BR")}</small></div><button className="button-secondary" onClick={()=>void manage("revoke_invite",{invite_id:i.id})}>Revogar</button></div>)}</section>}
      <p className="demo-disclaimer"><ShieldCheck size={14}/> Os dados financeiros são compartilhados somente dentro deste workspace. Visualizadores não podem alterar registros; editores não podem administrar membros.</p>
    </>}
  </div>;
}
