import { useEffect, useState } from "react";
import { Activity, CheckCircle2, CircleAlert } from "lucide-react";
import { checkSupabaseConnection } from "../lib/supabase";

type ConnectionState = "checking" | "connected" | "error";

export function SupabaseConnectionStatus() {
  const [state, setState] = useState<ConnectionState>("checking");

  useEffect(() => {
    let active = true;
    checkSupabaseConnection()
      .then(() => {
        if (active) setState("connected");
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const label =
    state === "connected"
      ? "Banco conectado"
      : state === "error"
        ? "Verificar conexão do banco"
        : "Conectando ao banco";

  const Icon =
    state === "connected"
      ? CheckCircle2
      : state === "error"
        ? CircleAlert
        : Activity;

  const color =
    state === "connected" ? "#16845d" : state === "error" ? "#b45309" : "#64748b";
  const background =
    state === "connected" ? "#e9f8f1" : state === "error" ? "#fff7ed" : "#f1f5f9";

  return (
    <div
      role="status"
      aria-live="polite"
      title={state === "error" ? "Confira se as tabelas public estão expostas na Data API do Supabase." : label}
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid rgba(15, 23, 42, .08)",
        borderRadius: 999,
        padding: "9px 13px",
        color,
        background,
        boxShadow: "0 8px 24px rgba(15, 23, 42, .10)",
        fontSize: 12,
        fontWeight: 650,
      }}
    >
      <Icon size={15} />
      {label}
    </div>
  );
}
