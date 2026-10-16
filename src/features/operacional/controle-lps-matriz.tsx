"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { salvarCelulaControle } from "./controle-lps-actions";
import { SUGESTOES_VALOR, tomDe, type TomCelula } from "./controle-lps-config";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface LinhaMatriz {
  id: string;
  nome: string;
  celulas: Record<string, string>;
}

const COR: Record<TomCelula, string> = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  andamento: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  pendente: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  nao_se_aplica: "bg-muted text-muted-foreground",
  neutro: "",
};

/** Matriz produto × itens do controle, com edição direto na célula. */
export function ControleLpsMatriz({
  versao,
  colunas,
  linhas: linhasIniciais,
}: {
  versao: string;
  colunas: string[];
  linhas: LinhaMatriz[];
}) {
  const [linhas, setLinhas] = useState(linhasIniciais);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<{ lp: string; col: string } | null>(
    null
  );
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  const termo = busca.trim().toLowerCase();
  const visiveis = useMemo(
    () =>
      linhas.filter((l) => !termo || l.nome.toLowerCase().includes(termo)),
    [linhas, termo]
  );

  // Resumo por coluna: quantas LPs concluídas / pendentes.
  const resumo = useMemo(() => {
    const r: Record<string, { ok: number; pendente: number }> = {};
    for (const col of colunas) {
      r[col] = { ok: 0, pendente: 0 };
      for (const l of linhas) {
        const t = tomDe(col, l.celulas[col] ?? "");
        if (t === "ok") r[col].ok++;
        else if (t === "pendente") r[col].pendente++;
      }
    }
    return r;
  }, [linhas, colunas]);

  function abrir(lp: LinhaMatriz, col: string) {
    setErro(null);
    setEditando({ lp: lp.id, col });
    setValor(lp.celulas[col] ?? "");
    setTimeout(() => entrada.current?.focus(), 0);
  }

  function salvar() {
    if (!editando) return;
    const { lp, col } = editando;
    const novo = valor.trim();
    const atual = linhas.find((l) => l.id === lp)?.celulas[col] ?? "";
    if (novo === atual) {
      setEditando(null);
      return;
    }
    startTransition(async () => {
      const res = await salvarCelulaControle(lp, col, versao, novo);
      if (res.erro) {
        setErro(res.erro);
        return;
      }
      setLinhas((ls) =>
        ls.map((l) => {
          if (l.id !== lp) return l;
          const celulas = { ...l.celulas };
          if (novo) celulas[col] = novo;
          else delete celulas[col];
          return { ...l, celulas };
        })
      );
      setEditando(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto…"
            className="h-9 w-64 pl-8"
            aria-label="Buscar produto"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {visiveis.length} de {linhas.length} produtos · clique em uma célula
          para editar
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          {(
            [
              ["ok", "Concluído"],
              ["andamento", "Em andamento"],
              ["pendente", "Pendente"],
              ["nao_se_aplica", "Não se aplica"],
            ] as [TomCelula, string][]
          ).map(([t, r]) => (
            <span
              key={t}
              className={cn("rounded px-2 py-0.5", COR[t])}
            >
              {r}
            </span>
          ))}
        </div>
      </div>
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

      <div className="max-h-[70vh] overflow-auto rounded-lg border">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[220px] border-b border-r bg-muted px-3 py-2 text-left font-semibold">
                Produto
              </th>
              {colunas.map((c) => (
                <th
                  key={c}
                  className="sticky top-0 z-20 min-w-[110px] max-w-[150px] border-b bg-muted px-2 py-2 text-center font-medium"
                  title={c}
                >
                  <span className="line-clamp-3">{c}</span>
                  <span className="mt-1 block text-[10px] font-normal text-muted-foreground">
                    {resumo[c].ok}✓{" "}
                    {resumo[c].pendente > 0 ? `${resumo[c].pendente}✗` : ""}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={l.id} className="hover:bg-accent/30">
                <th className="sticky left-0 z-10 border-b border-r bg-background px-3 py-1.5 text-left font-medium">
                  {l.nome}
                </th>
                {colunas.map((c) => {
                  const v = l.celulas[c] ?? "";
                  const emEdicao = editando?.lp === l.id && editando.col === c;
                  return (
                    <td
                      key={c}
                      className={cn(
                        "border-b p-0 text-center",
                        !emEdicao && COR[tomDe(c, v)]
                      )}
                    >
                      {emEdicao ? (
                        <div className="flex items-center gap-1 p-1">
                          <input
                            ref={entrada}
                            list="controle-sugestoes"
                            value={valor}
                            disabled={pendente}
                            onChange={(e) => setValor(e.target.value)}
                            onBlur={salvar}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") salvar();
                              if (e.key === "Escape") setEditando(null);
                            }}
                            className="h-7 w-full min-w-[96px] rounded border bg-background px-1.5 text-xs"
                          />
                          {pendente ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : null}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => abrir(l, c)}
                          className="block h-full w-full px-2 py-1.5"
                          aria-label={`${l.nome} — ${c}`}
                        >
                          {v || <span className="opacity-30">—</span>}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="controle-sugestoes">
        {SUGESTOES_VALOR.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}
