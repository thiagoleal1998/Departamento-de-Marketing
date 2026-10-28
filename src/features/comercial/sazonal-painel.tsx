"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search, Sparkles } from "lucide-react";
import {
  ORDEM_SITUACAO,
  ROTULO_CAMPO_SAZONAL,
  SITUACAO_SAZONAL,
  situacaoSazonal,
  type CampoSazonal,
  type HotelSazonal,
  type PeriodoView,
  type SituacaoSazonal,
} from "./sazonal-tipos";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SeloSituacao({ status, className }: { status: string; className?: string }) {
  const s = SITUACAO_SAZONAL[situacaoSazonal(status)];
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset", s.classe, className)}>{s.rotulo}</span>;
}

/** Bloco de um campo (condição, vendas…); some quando está vazio. */
export function BlocoCampo({ rotulo, valor, destaque = false, anterior }: { rotulo: string; valor: string; destaque?: boolean; anterior?: string }) {
  if (!valor && !anterior) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      {valor ? <p className={cn("whitespace-pre-line break-words", destaque ? "text-base font-semibold" : "text-sm")}>{valor}</p> : <p className="text-sm text-muted-foreground">—</p>}
      {anterior !== undefined && anterior !== valor ? (
        <p className="whitespace-pre-line break-words text-xs text-muted-foreground line-through">{anterior || "(vazio)"}</p>
      ) : null}
    </div>
  );
}

function Observacao({ texto }: { texto: string }) {
  const [aberta, setAberta] = useState(false);
  if (!texto) return null;
  const longa = texto.length > 160 || texto.split("\n").length > 3;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Observação</p>
      <p className={cn("whitespace-pre-line break-words text-sm", longa && !aberta && "line-clamp-3")}>{texto}</p>
      {longa ? (
        <button type="button" onClick={() => setAberta((v) => !v)} className="text-xs font-medium text-primary hover:underline">
          {aberta ? "Mostrar menos" : "Ver tudo"}
        </button>
      ) : null}
    </div>
  );
}

function CardHotel({ h }: { h: HotelSazonal & { atualizadoEm: string | null } }) {
  const mudou = (c: CampoSazonal) => (h.anterior && c in h.anterior ? h.anterior[c] : undefined);
  const mudados = h.anterior ? (Object.keys(h.anterior) as CampoSazonal[]).map((c) => ROTULO_CAMPO_SAZONAL[c]) : [];
  return (
    <article className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm", h.atualizadoEm && "border-amber-400 ring-2 ring-amber-400/70")}>
      {h.atualizadoEm ? (
        <p className="flex items-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-950">
          <Sparkles className="size-3.5" />
          {h.anterior === null ? "Hotel novo na campanha" : `Atualizado: ${mudados.join(", ")}`} · {h.atualizadoEm}
        </p>
      ) : null}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold leading-tight">{h.hotel}</h3>
          {h.status ? (
            <div className="space-y-1">
              <SeloSituacao status={h.status} />
              <p className="whitespace-pre-line text-xs text-muted-foreground">{h.status}</p>
            </div>
          ) : (
            <SeloSituacao status="" />
          )}
        </div>
        <BlocoCampo rotulo="Condição" valor={h.condicao} destaque anterior={mudou("condicao")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <BlocoCampo rotulo="Vendas" valor={h.vendas} anterior={mudou("vendas")} />
          <BlocoCampo rotulo="Hospedagens" valor={h.hospedagens} anterior={mudou("hospedagens")} />
        </div>
        <Observacao texto={h.observacao} />
      </div>
    </article>
  );
}

/** Aba "Períodos sazonais": hotéis de cada campanha, com busca e filtro por situação. */
export function PeriodosSazonais({ periodos }: { periodos: PeriodoView[] }) {
  const [id, setId] = useState(periodos[0]?.id ?? "");
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<SituacaoSazonal | "todas" | "atualizados">("todas");
  const periodo = periodos.find((p) => p.id === id) ?? periodos[0];

  const contagem = useMemo(() => {
    const m = new Map<SituacaoSazonal, number>();
    for (const h of periodo?.hoteis ?? []) m.set(situacaoSazonal(h.status), (m.get(situacaoSazonal(h.status)) ?? 0) + 1);
    return m;
  }, [periodo]);
  const atualizados = (periodo?.hoteis ?? []).filter((h) => h.atualizadoEm).length;

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return (periodo?.hoteis ?? [])
      .filter((h) => (situacao === "todas" ? true : situacao === "atualizados" ? !!h.atualizadoEm : situacaoSazonal(h.status) === situacao))
      .filter((h) => !t || [h.hotel, h.status, h.condicao, h.vendas, h.hospedagens, h.observacao].some((c) => c.toLowerCase().includes(t)));
  }, [periodo, busca, situacao]);

  if (!periodo) return null;

  const chip = (ativo: boolean) =>
    cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors", ativo ? "border-primary bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground");

  return (
    <div className="space-y-4">
      {periodos.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {periodos.map((p) => (
            <button key={p.id} type="button" onClick={() => setId(p.id)} className={chip(p.id === periodo.id)}>
              {p.nome}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{periodo.nome}</h2>
          <p className="text-xs text-muted-foreground">
            {periodo.hoteis.length} hotéis na planilha · atualizada no painel em <strong className="text-foreground">{periodo.sincronizadoEm ?? "nunca"}</strong>
            {periodo.erro ? <span className="text-destructive"> · Erro: {periodo.erro}</span> : null}
          </p>
        </div>
        <a href={periodo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <ExternalLink className="size-4" /> Abrir planilha
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setSituacao("todas")} className={chip(situacao === "todas")}>
          Todos <span className="text-muted-foreground">{periodo.hoteis.length}</span>
        </button>
        {ORDEM_SITUACAO.filter((s) => contagem.get(s)).map((s) => (
          <button key={s} type="button" onClick={() => setSituacao(s)} className={chip(situacao === s)}>
            {SITUACAO_SAZONAL[s].rotulo} <span className="text-muted-foreground">{contagem.get(s)}</span>
          </button>
        ))}
        {atualizados > 0 ? (
          <button type="button" onClick={() => setSituacao("atualizados")} className={chip(situacao === "atualizados")}>
            <Sparkles className="size-3.5 text-amber-500" /> Atualizados <span className="text-muted-foreground">{atualizados}</span>
          </button>
        ) : null}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar hotel, condição, observação…" className="h-9 pl-8" aria-label="Buscar" />
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum hotel encontrado.</p>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((h) => (
            <CardHotel key={h.chave} h={h} />
          ))}
        </div>
      )}
    </div>
  );
}
