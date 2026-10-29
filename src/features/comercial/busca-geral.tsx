"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ItemBusca {
  /** Para abrir o produto direto (vazio nos hotéis dos períodos sazonais). */
  chave: string;
  nome: string;
  /** Aba onde o item está. */
  aba: string;
  /** Texto de apoio mostrado ao lado (situação da LP, "Black"…). */
  etiquetas: string[];
  /** Condições e observações, em minúsculas e sem acento, para achar também pelo conteúdo. */
  texto: string;
}

const semAcento = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Busca em TODAS as abas do Comercial (produtos e hotéis dos períodos sazonais); ao escolher, abre a aba e o produto. */
export function BuscaGeral({ itens }: { itens: ItemBusca[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const caixa = useRef<HTMLInputElement>(null);

  const resultados = useMemo(() => {
    const termos = semAcento(q).split(/\s+/).filter(Boolean);
    if (termos.join("").length < 2) return [];
    return itens
      .map((i) => {
        const nome = semAcento(i.nome);
        const todos = termos.every((t) => nome.includes(t) || i.texto.includes(t));
        if (!todos) return null;
        const pontos = (nome.startsWith(termos[0]) ? 0 : termos.every((t) => nome.includes(t)) ? 1 : 2) + (i.chave ? 0 : 0.5);
        return { i, pontos };
      })
      .filter((x): x is { i: ItemBusca; pontos: number } => !!x)
      .sort((a, b) => a.pontos - b.pontos || a.i.nome.localeCompare(b.i.nome, "pt-BR"))
      .slice(0, 14)
      .map((x) => x.i);
  }, [q, itens]);

  function ir(i: ItemBusca) {
    setAberto(false);
    const base = `/comercial?aba=${encodeURIComponent(i.aba)}`;
    router.push(i.chave ? `${base}&abrir=${encodeURIComponent(i.chave)}` : base);
  }

  return (
    <div className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={caixa}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAberto(true);
          setAtivo(0);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAtivo((a) => Math.min(a + 1, resultados.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAtivo((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && resultados[ativo]) {
            e.preventDefault();
            ir(resultados[ativo]);
          } else if (e.key === "Escape") setAberto(false);
        }}
        placeholder="Buscar em todo o Comercial: hotel, produto, condição…"
        aria-label="Buscar em todo o Comercial"
        className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        autoComplete="off"
      />
      {q ? (
        <button type="button" aria-label="Limpar" onMouseDown={(e) => e.preventDefault()} onClick={() => { setQ(""); caixa.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      ) : null}

      {aberto && semAcento(q).trim().length >= 2 ? (
        <div className="absolute z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-xl border bg-popover p-1 shadow-lg">
          {resultados.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nada encontrado em nenhuma aba do Comercial.</p>
          ) : (
            <>
              <p className="px-3 py-1.5 text-[11px] text-muted-foreground">{resultados.length >= 14 ? "14+ resultados" : `${resultados.length} resultado(s)`} · em todas as abas</p>
              <ul>
                {resultados.map((r, k) => (
                  <li key={r.aba + r.chave + r.nome}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => ir(r)}
                      onMouseEnter={() => setAtivo(k)}
                      className={cn("flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors", k === ativo ? "bg-accent" : "hover:bg-accent/60")}
                    >
                      <span className="text-sm font-medium">{r.nome}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">{r.aba}</span>
                        {r.etiquetas.map((e) => (
                          <span key={e}>· {e}</span>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
