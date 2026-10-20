"use client";

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { dadosVinculo } from "@/features/chat/vinculos-actions";
import type { DadosVinculo } from "@/features/chat/vinculo-tipos";
import { NomeItemEditavel } from "@/features/estoque/nome-item-editavel";
import { cn } from "@/lib/utils";

/** Itens do estoque ligados à tarefa (criada pelo chat), com a opção de renomear (gerente). */
export function ItensEstoqueTarefa({ tarefaId }: { tarefaId: string }) {
  const [d, setD] = useState<DadosVinculo | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vivo = true;
    void dadosVinculo(tarefaId, [], null).then((r) => vivo && setD(r));
    return () => {
      vivo = false;
    };
  }, [tarefaId, recarga]);

  if (!d || d.itens.length === 0) return null;

  return (
    <section className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold">
        <Package className="size-4" /> Itens do estoque desta tarefa
      </h3>
      <ul className="space-y-1.5 text-sm">
        {d.itens.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <NomeItemEditavel
              itemId={item.id}
              nome={item.nome}
              podeRenomear={d.podeRenomearItens}
              aoRenomear={() => setRecarga((n) => n + 1)}
            />
            {item.renomeado ? (
              <span className="basis-full text-xs text-muted-foreground">
                ✏️ Nome trocado{item.renomeado.porNome ? " por " + item.renomeado.porNome : ""} em{" "}
                {new Date(item.renomeado.quando).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}
                {": “" + item.renomeado.de + "” → “" + item.renomeado.para + "”"}
              </span>
            ) : null}
            {item.pedido ? <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs">pedido: {item.pedido} un.</span> : null}
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-xs",
                item.quantidade <= 0
                  ? "bg-red-600 font-semibold text-white"
                  : item.quantidade <= item.estoque_minimo
                    ? "bg-red-100 text-red-800"
                    : "bg-muted"
              )}
            >
              {item.quantidade <= 0 ? "estoque ZERADO" : "estoque: " + item.quantidade} (mín. {item.estoque_minimo})
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
