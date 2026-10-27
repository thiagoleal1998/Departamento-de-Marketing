"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SmilePlus } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";
import { reacoesDaConversa, reagirAMensagem, type ReacaoLinha } from "./reacoes-actions";
import { EMOJIS_REACAO } from "./reacoes-constantes";
import { cn } from "@/lib/utils";

const mesma = (a: ReacaoLinha, mensagemId: string, usuarioId: string) => a.mensagem_id === mensagemId && a.usuario_id === usuarioId;

/** Reações da conversa em tempo real, com reagir/tirar (um emoji por pessoa, como no WhatsApp). */
export function useReacoes(conversaId: string | null, usuarioId: string) {
  const [lista, setLista] = useState<ReacaoLinha[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!conversaId) return setLista([]);
    setLista(await reacoesDaConversa(conversaId));
  }, [conversaId]);

  useEffect(() => {
    void carregar();
    if (!conversaId) return;
    const supabase = criarClienteBrowser();
    const canal = supabase
      .channel("chat-reacoes-" + conversaId)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_reacoes" }, (p) => {
        if (p.eventType === "DELETE") {
          const o = p.old as Partial<ReacaoLinha>;
          setLista((l) => l.filter((x) => !(x.mensagem_id === o.mensagem_id && x.usuario_id === o.usuario_id)));
          return;
        }
        const n = p.new as ReacaoLinha & { conversa_id: string };
        if (n.conversa_id !== conversaId) return;
        setLista((l) => [...l.filter((x) => !mesma(x, n.mensagem_id, n.usuario_id)), { mensagem_id: n.mensagem_id, usuario_id: n.usuario_id, emoji: n.emoji }]);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [conversaId, carregar]);

  const reagir = useCallback(
    async (mensagemId: string, emoji: string) => {
      const minha = lista.find((x) => mesma(x, mensagemId, usuarioId));
      const novo = minha?.emoji === emoji ? null : emoji; // mesmo emoji de novo = tirar
      setErro(null);
      setLista((l) => [...l.filter((x) => !mesma(x, mensagemId, usuarioId)), ...(novo ? [{ mensagem_id: mensagemId, usuario_id: usuarioId, emoji: novo }] : [])]);
      const r = await reagirAMensagem(mensagemId, novo);
      if (r.erro) {
        setErro(r.erro);
        void carregar();
      }
    },
    [lista, usuarioId, carregar]
  );

  return { lista, reagir, erro };
}

/** Reações abaixo da mensagem: um chip por emoji com a contagem; clicar no seu emoji tira. */
export function ReacoesDaMensagem({
  reacoes,
  usuarioId,
  nomeDe,
  onReagir,
  minha,
}: {
  reacoes: ReacaoLinha[];
  usuarioId: string;
  nomeDe: (id: string) => string;
  onReagir: (emoji: string) => void;
  minha: boolean;
}) {
  if (reacoes.length === 0) return null;
  const grupos = new Map<string, ReacaoLinha[]>();
  for (const r of reacoes) grupos.set(r.emoji, [...(grupos.get(r.emoji) ?? []), r]);
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {Array.from(grupos.entries()).map(([emoji, rs]) => {
        const euReagi = rs.some((r) => r.usuario_id === usuarioId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReagir(emoji)}
            title={rs.map((r) => (r.usuario_id === usuarioId ? "Você" : nomeDe(r.usuario_id))).join(", ")}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors",
              euReagi ? "border-primary bg-primary/15" : minha ? "border-white/40 bg-white/10 hover:bg-white/20" : "bg-background/70 hover:bg-background"
            )}
          >
            <span>{emoji}</span>
            {rs.length > 1 ? <span className="tabular-nums">{rs.length}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Botão de carinha que abre a barra de reações (posicionada na tela, sem ser cortada pela rolagem). */
export function SeletorReacao({ onEscolher, atual }: { onEscolher: (emoji: string) => void; atual?: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!pos) return;
    const fechar = () => setPos(null);
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && fechar();
    document.addEventListener("keydown", aoTecla);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("keydown", aoTecla);
      window.removeEventListener("resize", fechar);
    };
  }, [pos]);

  function abrir() {
    const r = botao.current?.getBoundingClientRect();
    if (!r) return;
    const largura = EMOJIS_REACAO.length * 36 + 16;
    setPos({ top: Math.max(8, r.top - 50), left: Math.min(Math.max(8, r.left + r.width / 2 - largura / 2), window.innerWidth - largura - 8) });
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={() => (pos ? setPos(null) : abrir())}
        aria-label="Reagir"
        title="Reagir"
        className="grid size-6 shrink-0 place-items-center self-center rounded-full text-muted-foreground opacity-50 transition hover:bg-muted hover:opacity-100 group-hover:opacity-100"
      >
        <SmilePlus className="size-3.5" />
      </button>
      {pos ? (
        <>
          <div className="fixed inset-0 z-[100]" onMouseDown={() => setPos(null)} />
          <div role="menu" aria-label="Escolha uma reação" className="fixed z-[101] flex gap-0.5 rounded-full border bg-popover p-1 shadow-xl" style={{ top: pos.top, left: pos.left }}>
            {EMOJIS_REACAO.map((e) => (
              <button
                key={e}
                type="button"
                role="menuitem"
                onClick={() => {
                  onEscolher(e);
                  setPos(null);
                }}
                className={cn("grid size-8 place-items-center rounded-full text-xl transition hover:scale-125 hover:bg-muted", atual === e && "bg-primary/15")}
              >
                {e}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
