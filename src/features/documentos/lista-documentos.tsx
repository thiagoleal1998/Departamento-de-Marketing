"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, FileText, Search, Trash2 } from "lucide-react";
import { removerDocumento } from "./actions";
import type { DocumentoCentral } from "./tipos";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Lista pesquisável de documentos, agrupada por categoria. */
export function ListaDocumentos({ docs, podeEditar }: { docs: DocumentoCentral[]; podeEditar: boolean }) {
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [, startTransition] = useTransition();

  const categorias = useMemo(() => Array.from(new Set(docs.map((d) => d.categoria))).sort(), [docs]);

  const grupos = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const filtrados = docs.filter(
      (d) => (!categoria || d.categoria === categoria) && (!t || d.nome.toLowerCase().includes(t))
    );
    const mapa = new Map<string, DocumentoCentral[]>();
    for (const d of filtrados.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))) {
      mapa.set(d.categoria, [...(mapa.get(d.categoria) ?? []), d]);
    }
    return [...mapa.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [docs, busca, categoria]);

  const total = grupos.reduce((n, [, l]) => n + l.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar documento…"
            aria-label="Buscar documento"
            className="h-9 w-72 pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["", ...categorias].map((c) => (
            <button
              key={c || "todas"}
              type="button"
              onClick={() => setCategoria(c)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                categoria === c ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              {c || "Todas"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {total} de {docs.length} documentos
        </span>
      </div>

      {grupos.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum documento encontrado.
        </p>
      ) : (
        grupos.map(([cat, lista]) => (
          <section key={cat} className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {cat} <span className="font-normal">({lista.length})</span>
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {lista.map((d) => {
                const link = d.url ?? d.notion_url;
                return (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                    <FileText className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.nome}</p>
                      {!d.url ? <p className="text-[11px] text-muted-foreground">Página no Notion</p> : null}
                    </div>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir ${d.nome}`}
                        className="text-primary"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : null}
                    {podeEditar ? (
                      <button
                        type="button"
                        aria-label={`Remover ${d.nome}`}
                        onClick={() => {
                          if (confirm(`Remover "${d.nome}" da lista?`)) startTransition(() => removerDocumento(d.id));
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
