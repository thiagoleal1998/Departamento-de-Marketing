"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Search, Sparkles, X } from "lucide-react";
import type { CampoProduto, MudancaCampo, ProdutoComercial } from "./tipos";
import { ROTULO_DIVERGENCIA, ROTULO_SITUACAO, type ConferenciaProduto, type SituacaoLp } from "./conferencia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ProdutoView extends Pick<ProdutoComercial, "chave" | "nome" | "tag" | "tagCor" | "campos"> {
  /** Aba da planilha de onde veio o produto. */
  secao: string;
  /** Conferência com as landing pages cadastradas no sistema. */
  conferencia: ConferenciaProduto;
  /** Alteração recente (se houver): quando e o que mudou. */
  alteracao?: {
    tipo: "novo" | "alterado";
    quando: string; // texto já formatado
    mudancas: MudancaCampo[];
  };
}

function corTexto(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return lum > 150 ? "#111827" : "#ffffff";
}

const ehUrl = (t: string) => /^https?:\/\//i.test(t.trim());

function primeira(campos: CampoProduto[], re: RegExp): string | null {
  return campos.find((c) => re.test(c.rotulo))?.linhas[0]?.t ?? null;
}

/** Campo completo (usado no painel de detalhes). */
function Campo({ campo, mudanca }: { campo: CampoProduto; mudanca?: MudancaCampo }) {
  const novas = new Set(mudanca?.depois ?? []);
  const antigas = new Set(mudanca?.antes ?? []);
  const removidas = (mudanca?.antes ?? []).filter((l) => !(mudanca?.depois ?? []).includes(l));

  return (
    <div className={cn("space-y-1 rounded-md p-3", mudanca ? "bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-950/40" : "bg-muted/40")}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {campo.rotulo}
        {mudanca ? (
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-white">
            alterado
          </span>
        ) : null}
      </p>
      <ul className="space-y-0.5 text-sm">
        {campo.linhas.map((l, i) => {
          const url = ehUrl(l.t);
          const nova = mudanca && !antigas.has(l.t) && novas.has(l.t);
          return (
            <li
              key={i}
              className={cn(
                "rounded px-1.5 py-0.5",
                nova && "bg-emerald-100 font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              )}
              style={l.bg ? { backgroundColor: l.bg, color: corTexto(l.bg) } : undefined}
            >
              {nova ? <span className="mr-1 font-bold">+</span> : null}
              {url ? (
                <a href={l.t} target="_blank" rel="noopener noreferrer" className="break-all underline">
                  {l.t}
                </a>
              ) : (
                l.t
              )}
            </li>
          );
        })}
        {removidas.map((l, i) => (
          <li key={`r${i}`} className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 line-through dark:bg-red-950 dark:text-red-300">
            <span className="mr-1 font-bold">−</span>
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Selos({ p }: { p: ProdutoView }) {
  const status = primeira(p.campos, /status/i);
  const pensao = primeira(p.campos, /pens/i);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge
        variant={p.conferencia.situacao === "ativa" ? "success" : p.conferencia.situacao === "inativa" ? "danger" : "muted"}
        title={p.conferencia.lps.length > 0 ? p.conferencia.lps.map((l) => `${l.nome} (${l.status ?? "sem status"})`).join(", ") + (p.conferencia.aproximado ? " — correspondência por nome aproximado" : "") : "Nenhuma LP do sistema corresponde a este produto"}
      >
        {ROTULO_SITUACAO[p.conferencia.situacao]}
      </Badge>
      {status ? <Badge variant="outline">Planilha: {status}</Badge> : null}
      {pensao ? <Badge variant="outline">{pensao}</Badge> : null}
      {p.tag ? (
        <span
          className="rounded px-1.5 py-0.5 text-[11px]"
          style={p.tagCor ? { backgroundColor: p.tagCor, color: corTexto(p.tagCor) } : undefined}
        >
          {p.tag}
        </span>
      ) : null}
    </div>
  );
}

/** Card resumido, sempre do mesmo tamanho. */
function CardResumo({ p, aoAbrir }: { p: ProdutoView; aoAbrir: () => void }) {
  const detalhes = p.campos.filter((c) => !/link|status|pens/i.test(c.rotulo));
  const alterados = p.alteracao?.mudancas.map((m) => m.campo) ?? [];

  return (
    <button
      type="button"
      id={`prod-${p.chave}`}
      onClick={aoAbrir}
      className={cn(
        "group relative flex h-[300px] w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        p.alteracao && "border-amber-400 ring-2 ring-amber-400/70"
      )}
    >
      {p.alteracao ? (
        <span className="flex shrink-0 items-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-950">
          <Sparkles className="size-3.5" />
          {p.alteracao.tipo === "novo" ? "Produto novo" : "Condições alteradas"} · {p.alteracao.quando}
        </span>
      ) : null}

      <span className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <span className="space-y-1.5">
          <span className="line-clamp-2 block text-base font-semibold leading-tight">{p.nome}</span>
          <Selos p={p} />
        </span>

        {p.conferencia.divergencia ? (
          <span className="block rounded bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
            ⚠ {ROTULO_DIVERGENCIA[p.conferencia.divergencia]}
          </span>
        ) : null}

        {alterados.length > 0 ? (
          <span className="block text-xs text-amber-800 dark:text-amber-300">
            Alterou: <strong>{alterados.join(", ")}</strong>
          </span>
        ) : null}

        <span className="min-h-0 flex-1 space-y-1.5 overflow-hidden text-sm">
          {detalhes.length === 0 ? (
            <span className="text-muted-foreground">Sem condições cadastradas.</span>
          ) : (
            detalhes.slice(0, 3).map((c) => (
              <span key={c.rotulo} className="block">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.rotulo}
                </span>
                {c.linhas.slice(0, 2).map((l, i) => (
                  <span key={i} className="block truncate text-[13px]">
                    {l.t}
                  </span>
                ))}
                {c.linhas.length > 2 ? (
                  <span className="block text-[11px] text-muted-foreground">+{c.linhas.length - 2} linhas</span>
                ) : null}
              </span>
            ))
          )}
        </span>
      </span>

      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-card via-card/95 to-transparent px-4 pb-3 pt-8 text-xs font-medium text-primary">
        <span className="group-hover:underline">Ver informações completas →</span>
        <span className="text-muted-foreground">{detalhes.reduce((n, c) => n + c.linhas.length, 0)} linhas</span>
      </span>
    </button>
  );
}

/** Painel com todas as informações do produto. */
function Detalhes({ p, aoFechar }: { p: ProdutoView; aoFechar: () => void }) {
  useEffect(() => {
    function aoTecla(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  const link = p.campos.find((c) => /link/i.test(c.rotulo))?.linhas.find((l) => ehUrl(l.t))?.t;
  const mudancas = new Map((p.alteracao?.mudancas ?? []).map((m) => [m.campo, m]));
  const detalhes = p.campos.filter((c) => !/link|status|pens/i.test(c.rotulo));
  const sumidos = (p.alteracao?.mudancas ?? []).filter(
    (m) => m.depois.length === 0 && !p.campos.some((c) => c.rotulo === m.campo)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p.nome}
        className="w-full max-w-4xl overflow-hidden rounded-xl border bg-background shadow-xl"
      >
        {p.alteracao ? (
          <div className="flex items-center gap-2 bg-amber-400 px-5 py-2 text-sm font-semibold text-amber-950">
            <Sparkles className="size-4" />
            {p.alteracao.tipo === "novo" ? "Produto novo" : "Condições alteradas"} · {p.alteracao.quando}
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold leading-tight">{p.nome}</h2>
            <Selos p={p} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {link ? (
              <Button asChild variant="outline" size="sm">
                <a href={link} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4" /> Página do produto
                </a>
              </Button>
            ) : null}
            <Button type="button" variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
              <X className="size-5" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 border-b px-5 py-4 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Conferência com as landing pages do sistema
          </p>
          {p.conferencia.divergencia ? (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300">
              ⚠ {ROTULO_DIVERGENCIA[p.conferencia.divergencia]}
            </p>
          ) : null}
          {p.conferencia.lps.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma LP cadastrada corresponde a este produto.</p>
          ) : (
            <ul className="space-y-1">
              {p.conferencia.lps.map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  <Badge variant={l.status === "ativo" ? "success" : "muted"}>{l.status ?? "sem status"}</Badge>
                  <span>{l.nome}</span>
                  {l.grupo ? <span className="text-xs text-muted-foreground">({l.grupo})</span> : null}
                </li>
              ))}
            </ul>
          )}
          {p.conferencia.aproximado ? (
            <p className="text-xs text-muted-foreground">Correspondência encontrada por semelhança de nome.</p>
          ) : null}
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          {detalhes.length === 0 && sumidos.length === 0 ? (
            <p className="text-sm text-muted-foreground md:col-span-2">Sem condições cadastradas.</p>
          ) : null}
          {detalhes.map((c) => (
            <Campo key={c.rotulo} campo={c} mudanca={mudancas.get(c.rotulo)} />
          ))}
          {sumidos.map((m) => (
            <Campo key={m.campo} campo={{ rotulo: m.campo, linhas: [] }} mudanca={m} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Lista de produtos em cards do mesmo tamanho, com busca, filtro e painel de detalhes. */
export function ListaProdutos({
  produtos,
  somenteAlterados: inicial = false,
  mostrarAba = false,
}: {
  produtos: ProdutoView[];
  somenteAlterados?: boolean;
  /** Exibe de qual aba da planilha cada produto veio. */
  mostrarAba?: boolean;
}) {
  const [situacao, setSituacao] = useState<"todas" | SituacaoLp | "divergentes">("todas");
  const [busca, setBusca] = useState("");
  const [soAlterados, setSoAlterados] = useState(inicial);
  const [aberto, setAberto] = useState<string | null>(null);
  const qtdAlterados = produtos.filter((p) => p.alteracao).length;

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return produtos
      .filter((p) => (soAlterados ? !!p.alteracao : true))
      .filter((p) =>
        situacao === "todas" ? true : situacao === "divergentes" ? !!p.conferencia.divergencia : p.conferencia.situacao === situacao
      )
      .filter(
        (p) =>
          !t ||
          p.nome.toLowerCase().includes(t) ||
          p.campos.some((c) => c.linhas.some((l) => l.t.toLowerCase().includes(t)))
      )
      .sort((a, b) => Number(!!b.alteracao) - Number(!!a.alteracao));
  }, [produtos, busca, soAlterados, situacao]);

  const selecionado = produtos.find((p) => p.chave === aberto) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto, condição, disponibilidade…"
            className="h-9 w-80 pl-8"
            aria-label="Buscar"
          />
        </div>
        <select
          value={situacao}
          onChange={(e) => setSituacao(e.target.value as typeof situacao)}
          aria-label="Situação da LP"
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          <option value="todas">Todas as situações</option>
          <option value="ativa">LP ativa</option>
          <option value="inativa">LP inativa</option>
          <option value="sem_status">LP sem status</option>
          <option value="sem_lp">Sem LP no sistema</option>
          <option value="divergentes">Somente divergentes</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soAlterados}
            onChange={(e) => setSoAlterados(e.target.checked)}
            className="size-4 accent-amber-500"
          />
          Somente alterados
          {qtdAlterados > 0 ? (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">{qtdAlterados}</span>
          ) : null}
        </label>
        <span className="text-xs text-muted-foreground">
          {visiveis.length} de {produtos.length} produtos
        </span>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((p) => (
            <div key={p.chave} className="flex min-w-0 flex-col gap-1">
              {mostrarAba ? (
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{p.secao}</p>
              ) : null}
              <CardResumo p={p} aoAbrir={() => setAberto(p.chave)} />
            </div>
          ))}
        </div>
      )}

      {selecionado ? <Detalhes p={selecionado} aoFechar={() => setAberto(null)} /> : null}
    </div>
  );
}
