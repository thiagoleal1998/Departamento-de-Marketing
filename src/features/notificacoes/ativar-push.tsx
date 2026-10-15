"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { salvarAssinaturaPush } from "./push-actions";

const CHAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function chaveParaBytes(base64: string): Uint8Array<ArrayBuffer> {
  const preenchida = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const bruto = atob(preenchida.replace(/-/g, "+").replace(/_/g, "/"));
  const saida = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i++) saida[i] = bruto.charCodeAt(i);
  return saida;
}

type Estado = "carregando" | "indisponivel" | "inativo" | "ativo" | "bloqueado";

/** Botão para ativar/desativar os avisos do navegador (push). */
export function AtivarPush() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (
        !CHAVE_PUBLICA ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (!cancelado) setEstado("indisponivel");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        if (Notification.permission === "denied") {
          if (!cancelado) setEstado("bloqueado");
          return;
        }
        const sub = await reg.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          // Mantém a assinatura sincronizada com este usuário.
          const json = sub.toJSON() as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
          };
          void salvarAssinaturaPush(json);
          if (!cancelado) setEstado("ativo");
        } else if (!cancelado) {
          setEstado("inativo");
        }
      } catch {
        if (!cancelado) setEstado("indisponivel");
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  async function ativar() {
    setErro(null);
    setTrabalhando(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "inativo");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveParaBytes(CHAVE_PUBLICA),
        }));
      const res = await salvarAssinaturaPush(
        sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      );
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      setEstado("ativo");
    } catch {
      setErro("Não foi possível ativar as notificações neste navegador.");
    } finally {
      setTrabalhando(false);
    }
  }

  // Depois de ativado, o botão some (nada mais a fazer aqui).
  if (estado === "carregando" || estado === "indisponivel" || estado === "ativo") {
    return null;
  }

  if (estado === "bloqueado") {
    return (
      <span
        title="As notificações estão bloqueadas neste navegador. Libere nas configurações do site (cadeado ao lado do endereço)."
        className="hidden items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground sm:flex"
      >
        <BellOff className="size-4" /> Avisos bloqueados
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={ativar}
        disabled={trabalhando}
        title="Receber avisos de mensagens e comunicados no navegador"
        className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
      >
        {trabalhando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <BellRing className="size-4" />
        )}
        <span className="hidden sm:inline">Ativar avisos</span>
      </button>
      {erro ? (
        <p className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover p-2 text-xs text-destructive shadow">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
