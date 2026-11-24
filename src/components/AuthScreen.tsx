import { useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";
import { TERMS_VERSION, PRIVACY_VERSION } from "../lib/privacy";

type AuthMode = "login" | "signup" | "forgot" | "recovery";

export function AuthScreen({ recoveryMode = false }: { recoveryMode?: boolean }) {
  const [mode, setMode] = useState<AuthMode>(recoveryMode ? "recovery" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const changeMode = (next: AuthMode) => {
    setMode(next);
    setMessage("");
    setError("");
    setPassword("");
    setConfirmPassword("");
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas não conferem.");
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim(), terms_accepted: termsAccepted, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION, marketing_consent: marketingConsent, cookie_consent: window.localStorage.getItem("nexus-cookie-choice") },
            emailRedirectTo: window.location.origin,
          },
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Cadastro iniciado! Confira seu e-mail e confirme o endereço para liberar o acesso.");
          setMode("login");
        } else {
          setMessage("Conta criada com sucesso. Bem-vindo ao NEXUS FINANCE!");
        }
      } else if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (authError) throw authError;
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (authError) throw authError;
        setMessage("Se esse e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.");
      } else {
        if (password.length < 8) throw new Error("A nova senha precisa ter pelo menos 8 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas não conferem.");
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Senha atualizada com sucesso. Você já pode continuar.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signup" ? "Crie sua conta" : mode === "forgot" ? "Recuperar acesso" : mode === "recovery" ? "Nova senha" : "Bem-vindo de volta";
  const subtitle = mode === "signup" ? "Comece a organizar as finanças do seu negócio." : mode === "forgot" ? "Enviaremos um link seguro para seu e-mail." : mode === "recovery" ? "Escolha uma nova senha para sua conta." : "Entre para acessar seu ambiente financeiro.";

  return (
    <main className="nexus-auth">
      <div className="auth-glow auth-glow-one" /><div className="auth-glow auth-glow-two" />
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark"><Sparkles size={22} /></div>
          <div><strong>NEXUS</strong><span>FINANCE</span></div>
        </div>
        <div className="auth-intro">
          <span className="auth-eyebrow"><ShieldCheck size={13}/> ACESSO À SUA CONTA</span>
          <h1>{title}</h1><p>{subtitle}</p>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && <label>Nome completo<input autoComplete="name" required value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?"/></label>}
          {mode !== "recovery" && <label>E-mail<div className="auth-input-wrap"><Mail size={17}/><input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@empresa.com"/></div></label>}
          {(mode === "login" || mode === "signup" || mode === "recovery") && <label>{mode === "recovery" ? "Nova senha" : "Senha"}<div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword?"text":"password"} autoComplete={mode==="login"?"current-password":"new-password"} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/><button className="auth-eye" type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Ocultar senha":"Mostrar senha"}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>}
          {(mode === "signup" || mode === "recovery") && <label>Confirmar senha<div className="auth-input-wrap"><LockKeyhole size={17}/><input type={showPassword?"text":"password"} autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Digite a senha novamente"/></div></label>}
          {mode === "signup" && <div className="auth-consent-group">
            <label className="auth-consent-row"><input type="checkbox" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)}/><span>Li e aceito os <a href="#terms-signup">Termos de Uso</a> e a <a href="#privacy-signup">Política de Privacidade</a>. Este aceite é obrigatório para criar a conta.</span></label>
            <label className="auth-consent-row"><input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)}/><span>Quero receber novidades e ofertas por e-mail. Opcional; posso cancelar a qualquer momento.</span></label>
            <details id="terms-signup"><summary>Consultar resumo dos Termos de Uso</summary><p>O NEXUS FINANCE é uma ferramenta de gestão. Antes de usar, confira regras, limitações, dados tratados, responsabilidades, condições comerciais e direitos do consumidor. Não há cobrança ou renovação automática ativa nesta versão. <a href="https://github.com/creditoslovable112-netizen/ola-connect/blob/feat/nexus-finance-foundation/docs/legal/TERMS_OF_USE_DRAFT.md" target="_blank" rel="noreferrer">Abrir documento integral (rascunho)</a>.</p></details>
            <details id="privacy-signup"><summary>Consultar resumo da Política de Privacidade</summary><p>Tratamos dados necessários à conta, segurança e funções solicitadas. Cookies não essenciais e marketing dependem de escolhas separadas. Você pode solicitar acesso, correção e exclusão quando cabível pelos controles de privacidade. A política integral e os dados do controlador devem ser revisados antes da publicação. <a href="https://github.com/creditoslovable112-netizen/ola-connect/blob/feat/nexus-finance-foundation/docs/legal/PRIVACY_POLICY_DRAFT.md" target="_blank" rel="noreferrer">Abrir documento integral (rascunho)</a>.</p></details>
          </div>}
          {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
          {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>{loading?"Aguarde...":mode==="signup"?"Criar minha conta":mode==="forgot"?"Enviar link de recuperação":mode==="recovery"?"Salvar nova senha":"Entrar no NEXUS"}<ArrowRight size={17}/></button>
        </form>
        <div className="auth-links">
          {mode === "login" && <><button type="button" onClick={()=>changeMode("forgot")}>Esqueci minha senha</button><span>Não tem conta? <button type="button" onClick={()=>changeMode("signup")}>Criar conta</button></span></>}
          {mode === "signup" && <span>Já tem uma conta? <button type="button" onClick={()=>changeMode("login")}>Fazer login</button></span>}
          {mode === "forgot" && <button type="button" onClick={()=>changeMode("login")}>Voltar para o login</button>}
          {mode === "recovery" && <span>Use pelo menos 8 caracteres, incluindo letras e números.</span>}
        </div>
        <div className="auth-security"><LockKeyhole size={13}/> O acesso aos registros é limitado por políticas de usuário no banco.</div>
      </section>
      <footer className="auth-footer"><span>NEXUS FINANCE · Gestão financeira inteligente</span><nav aria-label="Documentos legais"><a href="https://github.com/creditoslovable112-netizen/ola-connect/blob/feat/nexus-finance-foundation/docs/legal/TERMS_OF_USE_DRAFT.md" target="_blank" rel="noreferrer">Termos de Uso</a><a href="https://github.com/creditoslovable112-netizen/ola-connect/blob/feat/nexus-finance-foundation/docs/legal/PRIVACY_POLICY_DRAFT.md" target="_blank" rel="noreferrer">Política de Privacidade</a></nav><small>Identificação do fornecedor e canal de privacidade serão publicados após confirmação dos dados empresariais.</small></footer>
    </main>
  );
}
