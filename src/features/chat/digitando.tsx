"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { criarClienteBrowser } from "@/lib/supabase/client";

const EXPIRA_MS = 4000; // sem sinal por este tempo, a pessoa deixa de aparecer como "digitando"
const INTERVALO_MS = 2500; // no máximo um sinal a cada 2,5 s enquanto a pessoa digita

/**
 * "Digitando…" em tempo real. Usa o canal de transmissão do Supabase (broadcast): nada é gravado no banco,
 * o sinal vai direto de quem digita para quem está com a conversa aberta.
 */
export function useDigitando(conversaId: string | null, usuarioId: string) {
  const [ativos, setAtivos] = useState<Record<string, number>>({});
  const canal = useRef<RealtimeChannel | null>(null);
  const ultimoEnvio = useRef(0);

  useEffect(() => {
    setAtivos({});
    if (!conversaId) return;
    const supabase = criarClienteBrowser();
    const c = supabase
      .channel("digitando-" + conversaId, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "digitando" }, ({ payload }) => {
        const u = (payload as { u?: string } | null)?.u;
        if (u && u !== usuarioId) setAtivos((a) => ({ ...a, [u]: Date.now() }));
      })
      .on("broadcast", { event: "parou" }, ({ payload }) => {
        const u = (payload as { u?: string } | null)?.u;
        if (u) {
          setAtivos((a) => {
            const { [u]: _removido, ...resto } = a;
            void _removido;
            return resto;
          });
        }
      })
      .subscribe();
    canal.current = c;

    // Quem parou de mandar sinal sai da lista.
    const limpeza = setInterval(() => {
      setAtivos((a) => {
        const agora = Date.now();
        const mantidos = Object.entries(a).filter(([, t]) => agora - t < EXPIRA_MS);
        return mantidos.length === Object.keys(a).length ? a : Object.fromEntries(mantidos);
      });
    }, 1000);

    return () => {
      clearInterval(limpeza);
      canal.current = null;
      void supabase.removeChannel(c);
    };
  }, [conversaId, usuarioId]);

  /** Chame a cada tecla digitada: avisa os outros (com intervalo mínimo). */
  const avisarDigitando = useCallback(() => {
    const agora = Date.now();
    if (agora - ultimoEnvio.current < INTERVALO_MS) return;
    ultimoEnvio.current = agora;
    void canal.current?.send({ type: "broadcast", event: "digitando", payload: { u: usuarioId } });
  }, [usuarioId]);

  /** Ao enviar a mensagem ou apagar o texto: o "digitando" some na hora para os outros. */
  const parouDeDigitar = useCallback(() => {
    ultimoEnvio.current = 0;
    void canal.current?.send({ type: "broadcast", event: "parou", payload: { u: usuarioId } });
  }, [usuarioId]);

  return { digitando: Object.keys(ativos), avisarDigitando, parouDeDigitar };
}

/** Linha "Fulano está digitando…" com os três pontinhos. Ocupa sempre o mesmo espaço para a tela não pular. */
export function IndicadorDigitando({ ids, nomeDe, className }: { ids: string[]; nomeDe: (id: string) => string; className?: string }) {
  const nomes = ids.map((id) => nomeDe(id).split(" ")[0]);
  const texto =
    nomes.length === 0
      ? ""
      : nomes.length === 1
        ? `${nomes[0]} está digitando`
        : nomes.length === 2
          ? `${nomes[0]} e ${nomes[1]} estão digitando`
          : "Várias pessoas estão digitando";
  return (
    <div className={"flex h-5 items-center gap-1 px-3 text-xs text-muted-foreground " + (className ?? "")} aria-live="polite">
      {texto ? (
        <>
          <span>{texto}</span>
          <span className="flex gap-0.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </span>
        </>
      ) : null}
    </div>
  );
}
