import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

function decodeVapidKey(value: string): Uint8Array {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function PushNotificationSettings() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Verificando este dispositivo…");

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;
      if (!alive) return;
      setSupported(available);
      if (!available) {
        setMessage("Este navegador não oferece suporte a notificações push ou precisa de HTTPS.");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.ready;
        const current = await registration.pushManager.getSubscription();
        if (!alive) return;
        setSubscribed(Boolean(current));
        setMessage(current ? "Notificações ativadas neste dispositivo." : "Notificações ainda não ativadas neste dispositivo.");
      } catch {
        if (alive) setMessage("Não foi possível verificar as notificações neste dispositivo.");
      }
    };
    void check();
    return () => { alive = false; };
  }, []);

  const activate = async () => {
    setBusy(true);
    setMessage("Solicitando permissão e preparando o dispositivo…");
    try {
      if (!supported) throw new Error("Este navegador não oferece suporte a notificações push.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error(permission === "denied" ? "Permissão bloqueada no navegador. Altere nas configurações do site." : "Permissão não concedida.");
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Entre na sua conta para ativar as notificações.");
      const { data: config, error: configError } = await supabase.functions.invoke("nexus-push", { body: { action: "config" } });
      if (configError) throw configError;
      if (typeof config?.publicKey !== "string" || !config.publicKey) throw new Error("As chaves de notificação ainda não foram configuradas no servidor.");
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(config.publicKey),
        });
      }
      const serialized = subscription.toJSON();
      const p256dh = serialized.keys?.p256dh;
      const auth = serialized.keys?.auth;
      if (!subscription.endpoint || !p256dh || !auth) throw new Error("O navegador não retornou os dados completos da inscrição.");
      const { error: saveError } = await supabase.from("push_subscriptions").upsert({
        user_id: userData.user.id,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,endpoint" });
      if (saveError) throw saveError;
      setSubscribed(true);
      setMessage("Pronto! Este dispositivo está inscrito para receber notificações.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ativar as notificações.");
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").delete()
          .eq("user_id", userData.user?.id ?? "")
          .eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notificações desativadas neste dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível desativar as notificações.");
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMessage("Enviando notificação de teste…");
    try {
      const { data, error } = await supabase.functions.invoke("nexus-push", { body: { action: "send-test" } });
      if (error) throw error;
      if (data?.sent === 0) throw new Error("Nenhum dispositivo inscrito foi encontrado.");
      setMessage("Solicitação de teste enviada. Confira as notificações do dispositivo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar o teste.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="push-settings" aria-labelledby="push-settings-title">
    <div>
      <h3 id="push-settings-title">Notificações no celular e computador</h3>
      <p>Receba avisos do NEXUS mesmo quando o aplicativo não estiver aberto, se o navegador e o sistema permitirem.</p>
      <small role="status">{message}</small>
    </div>
    <div className="push-settings-actions">
      {!subscribed
        ? <button className="button-primary" type="button" onClick={activate} disabled={busy || !supported}>Ativar neste dispositivo</button>
        : <>
            <button className="button-primary" type="button" onClick={sendTest} disabled={busy}>Enviar notificação de teste</button>
            <button className="push-secondary-button" type="button" onClick={deactivate} disabled={busy}>Desativar neste dispositivo</button>
          </>}
    </div>
  </section>;
}
