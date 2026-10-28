"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VEREDITOS, type MarcacaoRevisao, type RevisaoPeca, type VereditoRevisao } from "./revisao-tipos";

/** A imagem com os retângulos numerados por cima. Clicar numa marcação a destaca (e a lista acompanha). */
export function PecaMarcada({
  imagem,
  marcacoes,
  destaque,
  onDestaque,
  className,
  children,
}: {
  imagem: string;
  marcacoes: MarcacaoRevisao[];
  destaque?: number | null;
  onDestaque?: (n: number | null) => void;
  className?: string;
  /** camada extra por cima (usada pelo editor para desenhar) */
  children?: React.ReactNode;
}) {
  return (
    <div className="relative inline-block max-w-full select-none">
      <img src={imagem} alt="Peça em revisão" draggable={false} className={cn("block h-auto max-w-full rounded-md", className)} />
      {marcacoes.map((m) => (
        <button
          key={m.n}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDestaque?.(destaque === m.n ? null : m.n);
          }}
          style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%` }}
          className={cn(
            "absolute rounded-[3px] border-2 transition-colors",
            destaque === m.n ? "z-10 border-red-500 bg-red-500/25" : "border-red-500/90 bg-red-500/10 hover:bg-red-500/20"
          )}
          aria-label={`Apontamento ${m.n}`}
        >
          <span className="absolute -left-0.5 -top-5 grid h-5 min-w-5 place-items-center rounded bg-red-600 px-1 text-[11px] font-bold leading-none text-white shadow">{m.n}</span>
        </button>
      ))}
      {children}
    </div>
  );
}

function ListaApontamentos({ marcacoes, destaque, onDestaque }: { marcacoes: MarcacaoRevisao[]; destaque: number | null; onDestaque: (n: number | null) => void }) {
  return (
    <ol className="space-y-1.5">
      {marcacoes.map((m) => (
        <li key={m.n}>
          <button
            type="button"
            onClick={() => onDestaque(destaque === m.n ? null : m.n)}
            className={cn("flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-sm transition-colors", destaque === m.n ? "border-red-500 bg-red-500/10" : "hover:bg-muted")}
          >
            <span className="mt-0.5 grid h-5 min-w-5 shrink-0 place-items-center rounded bg-red-600 px-1 text-[11px] font-bold text-white">{m.n}</span>
            <span className="min-w-0 whitespace-pre-wrap break-words">{m.texto || <em className="text-muted-foreground">sem comentário</em>}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/** Tela cheia da peça com os apontamentos ao lado. */
function Visualizador({ revisao, aoFechar }: { revisao: RevisaoPeca; aoFechar: () => void }) {
  const [destaque, setDestaque] = useState<number | null>(null);
  useEffect(() => {
    const t = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", t);
    return () => document.removeEventListener("keydown", t);
  }, [aoFechar]);
  const v = VEREDITOS[revisao.veredito] ?? VEREDITOS.ajustes;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className="flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate font-semibold">{revisao.nome || "Peça em revisão"}</h2>
            <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", v.classe)}>{v.rotulo}</span>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 items-start justify-center overflow-auto rounded-lg bg-muted/40 p-2">
            <PecaMarcada imagem={revisao.imagem} marcacoes={revisao.marcacoes} destaque={destaque} onDestaque={setDestaque} className="max-h-[75vh] w-auto" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {revisao.marcacoes.length} {revisao.marcacoes.length === 1 ? "apontamento" : "apontamentos"}
            </p>
            {revisao.marcacoes.length === 0 ? <p className="text-sm text-muted-foreground">Sem marcações na imagem.</p> : <ListaApontamentos marcacoes={revisao.marcacoes} destaque={destaque} onDestaque={setDestaque} />}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * A peça dentro do balão do chat: miniatura com as marcações, resumo dos apontamentos e botão para ampliar.
 * No pedido de revisão mostra a situação (`status`: aguardando, ajustes ou aprovada) e um botão de ação, se houver.
 */
export function RevisaoCard({
  revisao,
  minha,
  status,
  acao,
}: {
  revisao: RevisaoPeca;
  minha: boolean;
  status?: VereditoRevisao;
  acao?: { rotulo: string; aoClicar: () => void };
}) {
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState<number | null>(null);
  const ehPedido = revisao.tipo === "pedido";
  const v = VEREDITOS[ehPedido ? (status ?? "aguardando") : revisao.veredito] ?? VEREDITOS.ajustes;

  return (
    <div className={cn("mb-1 mt-1 space-y-2 rounded-xl border p-2 text-foreground", minha ? "border-white/30 bg-background" : "bg-background")}>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold">
          {ehPedido ? "📥 Pedido de revisão" : "🖼️ Revisão"} · {revisao.nome || "peça"}
        </span>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", v.classe)}>{v.rotulo}</span>
      </div>
      <div className="relative">
        <PecaMarcada imagem={revisao.imagem} marcacoes={revisao.marcacoes} destaque={destaque} onDestaque={setDestaque} className="max-h-72 w-auto" />
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black/80"
        >
          <Maximize2 className="size-3" /> Ampliar
        </button>
      </div>
      {revisao.marcacoes.length > 0 ? <ListaApontamentos marcacoes={revisao.marcacoes} destaque={destaque} onDestaque={setDestaque} /> : null}
      {acao ? (
        <button type="button" onClick={acao.aoClicar} className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          {acao.rotulo}
        </button>
      ) : null}
      {aberto ? <Visualizador revisao={revisao} aoFechar={() => setAberto(false)} /> : null}
    </div>
  );
}
