"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface LeituraLinha {
  mensagem_id: string;
  usuario_id: string;
  lida_em: string;
}

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaHora = (iso: string) => {
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  return mesmoDia ? hora(iso) : `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${hora(iso)}`;
};

/** Quem já leu cada mensagem da conversa, em tempo real (tabela chat_leituras, migration 0081). */
export function useLeituras(conversaId: string | null) {
  const [lista, setLista] = useState<LeituraLinha[]>([]);

  useEffect(() => {
    let vivo = true;
    setLista([]);
    if (!conversaId) return;
    const supabase = criarClienteBrowser();
    void supabase
      .from("chat_leituras")
      .select("mensagem_id, usuario_id, lida_em")
      .eq("conversa_id", conversaId)
      .order("lida_em", { ascending: false })
      .limit(3000)
      .then(({ data, error }) => {
        // Sem a migration a tabela não existe: segue sem confirmação de leitura.
        if (vivo && !error) setLista((data as LeituraLinha[] | null) ?? []);
      });
    const canal = supabase
      .channel("chat-leituras-" + conversaId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_leituras", filter: `conversa_id=eq.${conversaId}` }, (p) => {
        const n = p.new as LeituraLinha;
        setLista((l) => (l.some((x) => x.mensagem_id === n.mensagem_id && x.usuario_id === n.usuario_id) ? l : [...l, n]));
      })
      .subscribe();
    return () => {
      vivo = false;
      void supabase.removeChannel(canal);
    };
  }, [conversaId]);

  return lista;
}

/**
 * Selo no balão das mensagens que eu enviei: "Enviada" (um traço) ou "Lida 14:32" (dois traços azuis).
 * Na sala geral mostra quantas pessoas leram; clicar abre quem leu e a que horas.
 */
export function StatusLeitura({
  leituras,
  nomeDe,
  ehGeral,
}: {
  leituras: LeituraLinha[];
  nomeDe: (id: string) => string;
  ehGeral: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  if (leituras.length === 0) {
    return (
      <span className="inline-flex items-center gap-0.5" title="Enviada, ainda não lida">
        <Check className="size-3" /> Enviada
      </span>
    );
  }

  const ordenadas = [...leituras].sort((a, b) => a.lida_em.localeCompare(b.lida_em));
  const primeira = ordenadas[0];

  if (!ehGeral) {
    return (
      <span className="inline-flex items-center gap-0.5" title={`Lida em ${new Date(primeira.lida_em).toLocaleString("pt-BR")}`}>
        <CheckCheck className="size-3.5 text-sky-300" /> Lida {diaHora(primeira.lida_em)}
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setAberto((a) => !a)} className="inline-flex items-center gap-0.5 hover:underline" aria-expanded={aberto}>
        <CheckCheck className="size-3.5 text-sky-300" /> Lida por {leituras.length}
      </button>
      {aberto ? (
        <span className={cn("absolute bottom-full right-0 z-20 mb-1 block w-48 rounded-lg border bg-popover p-2 text-left text-xs text-popover-foreground shadow-lg")}>
          <span className="mb-1 block font-semibold">Quem leu</span>
          {ordenadas.map((l) => (
            <span key={l.usuario_id} className="flex justify-between gap-2 py-0.5">
              <span className="truncate">{nomeDe(l.usuario_id)}</span>
              <span className="shrink-0 text-muted-foreground">{diaHora(l.lida_em)}</span>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}
