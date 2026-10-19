"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search, Sparkles } from "lucide-react";
import type { CampoProduto, MudancaCampo, ProdutoComercial } from "./tipos";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ProdutoView extends Pick<ProdutoComercial, "chave" | "nome" | "tag" | "tagCor" | "campos"> {
  /** Alteração recente (se houver): quando e o que mudou. */
  alteracao?: {
    tipo: "novo" | "alterado";
    quando: string; // texto já formatado
    mudancas: MudancaCampo[];
  };
}

const LIMITE_LINHAS = 6;

function corTexto(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (((n >> 16) & 255) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  return lum > 150 ? "#111827" : "#ffffff";
}

const ehUrl = (t: string) => /^https?:\/\//i.test(t.trim());

function primeira(campos: CampoProduto[], re: RegExp): string | null {
  return campos.find((c) => re.test(c.rotulo))?.linhas[0]?.t ?? null;
}

function Campo({
  campo,
  mudanca,
  aberto,
}: {
  campo: CampoProduto;
  mudanca?: MudancaCampo;
  aberto: boolean;
}) {
  const novas = new Set(mudanca?.depois ?? []);
  const antigas = new Set(mudanca?.antes ?? []);
  const linhas = aberto ? campo.linhas : campo.linhas.slice(0, LIMITE_LINHAS);
  const removidas = (mudanca?.antes ?? []).filter((l) => !(mudanca?.depois ?? []).includes(l));

  return (
    <div className={cn("space-y-1 rounded-md p-2", mudanca && "bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-950/40")}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {campo.rotulo}
        {mudanca ? (
          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-white">
            alterado
          </span>
        ) : null}
      </p>
      <ul className="space-y-0.5 text-sm">
        {linhas.map((l, i) => {
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
                <a href={l.t} target="_blank" rel="noopener noreferrer" className="underline">
                  {l.t.replace(/^https?:\/\//i, "").slice(0, 60)}
                </a>
              ) : (
                l.t
              )}
            </li>
          );
        })}
        {removidas.map((l, i) => (
          <li
            key={`r${i}`}
            className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 line-through dark:bg-red-950 dark:text-red-300"
          >
            <span className="mr-1 font-bold no-underline">−</span>
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardProduto({ p }: { p: ProdutoView }) {
  const [aberto, setAberto] = useState(false);
  const status = primeira(p.campos, /status/i);
  const pensao = primeira(p.campos, /pens/i);
  const link = p.campos.find((c) => /link/i.test(c.rotulo))?.linhas.find((l) => ehUrl(l.t))?.t;
  const mudancas = new Map((p.alteracao?.mudancas ?? []).map((m) => [m.campo, m]));
  const detalhes = p.campos.filter((c) => !/link|status|pens/i.test(c.rotulo));
  const longo = detalhes.some((c) => c.linhas.length > LIMITE_LINHAS);
  // Campos que existiam e ficaram vazios: ainda aparecem como alterados.
  const sumidos = (p.alteracao?.mudancas ?? []).filter(
    (m) => m.depois.length === 0 && !p.campos.some((c) => c.rotulo === m.campo)
  );

  return (
    <Card
      id={`prod-${p.chave}`}
      className={cn(
        "flex flex-col overflow-hidden",
        p.alteracao && "border-amber-400 shadow-md ring-2 ring-amber-400/70"
      )}
    >
      {p.alteracao ? (
        <div className="flex items-center gap-2 bg-amber-400 px-4 py-1.5 text-xs font-semibold text-amber-950">
          <Sparkles className="size-3.5" />
          {p.alteracao.tipo === "novo" ? "Produto novo" : "Condições alteradas"} · {p.alteracao.quando}
        </div>
      ) : null}
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-tight">{p.nome}</h3>
            {link ? (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-primary"
                aria-label="Abrir página do produto"
                title="Abrir página do produto"
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {status ? <Badge variant={/^ativ/i.test(status) ? "success" : "muted"}>{status}</Badge> : null}
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
        </div>

        {detalhes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem condições cadastradas.</p>
        ) : (
          <div className="space-y-2">
            {detalhes.map((c) => (
              <Campo key={c.rotulo} campo={c} mudanca={mudancas.get(c.rotulo)} aberto={aberto} />
            ))}
            {sumidos.map((m) => (
              <Campo
                key={m.campo}
                campo={{ rotulo: m.campo, linhas: [] }}
                mudanca={m}
                aberto
              />
            ))}
          </div>
        )}

        {longo ? (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="mt-auto self-start text-xs font-medium text-primary hover:underline"
          >
            {aberto ? "Mostrar menos" : "Mostrar tudo"}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Lista de produtos em cards, com busca e filtro de alterados. */
export function ListaProdutos({
  produtos,
  somenteAlterados: inicial = false,
}: {
  produtos: ProdutoView[];
  somenteAlterados?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [soAlterados, setSoAlterados] = useState(inicial);
  const qtdAlterados = produtos.filter((p) => p.alteracao).length;

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return produtos
      .filter((p) => (soAlterados ? !!p.alteracao : true))
      .filter(
        (p) =>
          !t ||
          p.nome.toLowerCase().includes(t) ||
          p.campos.some((c) => c.linhas.some((l) => l.t.toLowerCase().includes(t)))
      )
      .sort((a, b) => Number(!!b.alteracao) - Number(!!a.alteracao));
  }, [produtos, busca, soAlterados]);

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
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soAlterados}
            onChange={(e) => setSoAlterados(e.target.checked)}
            className="size-4 accent-amber-500"
          />
          Somente alterados
          {qtdAlterados > 0 ? (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-950">
              {qtdAlterados}
            </span>
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
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((p) => (
            <CardProduto key={p.chave} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
