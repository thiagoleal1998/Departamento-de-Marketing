"use client";

import { useEffect, useState } from "react";
import { Package, Store, X } from "lucide-react";
import { CotacoesItem } from "@/features/fornecedores/cotacoes-item";
import type { EstoqueItem } from "@/types/database";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORIA: Record<string, string> = { brinde: "Brinde", flyer: "Flyer", banner: "Banner", outro: "Outro" };

/** Janela do produto: resumo e a aba Fornecedor (cotações, compras, contato, nota fiscal e gráfico de preços). */
export function ProdutoDetalhe({ item, aoFechar }: { item: EstoqueItem; aoFechar: () => void }) {
  const [aba, setAba] = useState<"resumo" | "fornecedor">("fornecedor");

  useEffect(() => {
    // Esc fecha só a janela de cima (se o cadastro de fornecedor estiver aberto, ele fecha primeiro).
    const aoTecla = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector('[aria-label="Fornecedor"]') && aoFechar();
    document.addEventListener("keydown", aoTecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  const nome = item.cor ? `${item.nome} (${item.cor})` : item.nome;
  const abas = [
    { id: "resumo", rotulo: "Resumo", icone: Package },
    { id: "fornecedor", rotulo: "Fornecedor", icone: Store },
  ] as const;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div role="dialog" aria-modal="true" aria-label={nome} className="w-full max-w-3xl rounded-xl border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold">{nome}</h2>
            <p className="text-sm text-muted-foreground">
              {CATEGORIA[item.categoria] ?? item.categoria} · {item.quantidade} em estoque · mínimo {item.estoque_minimo}
            </p>
          </div>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={aoFechar}>
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex gap-1 border-b px-3" aria-label="Seções do produto">
          {abas.map((a) => {
            const Icone = a.icone;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setAba(a.id)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  aba === a.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icone className="size-4" /> {a.rotulo}
              </button>
            );
          })}
        </nav>

        <div className="p-5">
          {aba === "resumo" ? (
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Campo rotulo="Categoria" valor={CATEGORIA[item.categoria] ?? item.categoria} />
              <Campo rotulo="Cor / variação" valor={item.cor} />
              <Campo rotulo="Em estoque" valor={String(item.quantidade)} />
              <Campo rotulo="Estoque mínimo" valor={String(item.estoque_minimo)} />
              <Campo rotulo="Danificados" valor={item.danificados > 0 ? String(item.danificados) : null} />
              <Campo rotulo="Local" valor={item.local} />
              <Campo rotulo="Alerta de estoque baixo" valor={item.ignorar_alerta ? "Desconsiderado (produto pontual)" : "Ativo"} />
              <div className="sm:col-span-2">
                <Campo rotulo="Descrição" valor={item.descricao} />
              </div>
              <div className="sm:col-span-2">
                <Campo rotulo="Observações" valor={item.observacoes} />
              </div>
            </dl>
          ) : (
            <CotacoesItem itemId={item.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="whitespace-pre-line font-medium">{valor || "—"}</dd>
    </div>
  );
}
